import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  StateGraph,
  START,
  END,
} from '@langchain/langgraph';
import { RunnableLambda } from '@langchain/core/runnables';

// --- Types ---
export type Message = { role: 'user' | 'agent' | 'bot'; content: string; type?: ResponseType; timestamp?: string };
export type FormatType = 'table' | 'chart' | 'list';
export type ResponseType = 'clarify' | 'data' | 'general';

// New interface for stock data
export interface StockData {
  symbol: string;
  price: number;
  volume: number;
}

// New type to store visualization history items
export type VisualizationHistoryItem = {
  type: 'data' | 'general';
  format?: FormatType;
  data?: any;
  content?: string;
  timestamp: string; // To help with ordering and display
};

// --- Define Graph State ---
export type GraphState = {
  history: Message[];
  selection?: FormatType;
  dataQuery?: string;
  response?: {
    type: ResponseType;
    options?: string[];
    data?: any;
    format?: FormatType;
    content?: string;
  };
  next?: 'Clarifier' | 'Executor' | 'ResponseFormatter' | 'GeneralAnswer' | 'DataClarifier';
  ResponseFormatter?: { response?: AgentResponse };
  // Add visualization history to GraphState (primarily used for passing through graph)
  visualizationHistory?: VisualizationHistoryItem[];
};

export type AgentResponse = NonNullable<GraphState['response']>;

// --- Gemini Setup ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const gemini = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// --- Node 1: Intent Analyzer ---
const IntentAnalyzer = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const lastUserMsg =
    state.history.filter((m: Message) => m.role === 'user').slice(-1)[0]?.content || '';

  const prompt = `You are a highly specialized AI assistant for financial data visualization. Your primary function is to help users display financial information. Your domain is strictly limited to financial data and its visualization. You are NOT a general knowledge chatbot. Your core purpose is financial data visualization. 

Analyze the user's message: "${lastUserMsg}"

Determine the user's intent based on the following precise definitions:

1.  **"financial_data" intent**: Use this if the user is requesting to *see*, *display*, or *visualize* financial data. Keywords indicating this intent include strong verbs or phrases related to presentation or specific visualization types: "show me data", "display stocks", "visualize report", "chart financials", "table prices", "list companies", "show financials", "financial data". If a specific format (e.g., "table", "chart", "list") is *not* explicitly mentioned, then the "data_format" MUST be "none". Do NOT infer a format if not explicitly stated. **Crucially, if the user mentions a specific company (e.g., "AAPL", "Google"), sector (e.g., "tech sector"), or financial metric (e.g., "volume"), extract that exact phrase as the "data_query". If no specific data query is found, set it to "none".**
    **Special Rule for "create a component": If the user's message is "create a component" or similar phrasing explicitly asking to build a visual element, classify it as "financial_data" with "data_format" as "none" and "data_query" as "none". The system will then guide the user to specify the format.**

2.  **"general_qa" intent**: Use this if the user is asking a general question that is *not* a direct request for data visualization. This includes:
    *   Asking for definitions: "what is stock volume?", "explain market capitalization".
    *   General inquiries about financial concepts that don't involve displaying data.
    *   Questions completely unrelated to finance (e.g., about cooking recipes, sports scores, historical events, current news (non-financial), personal opinions, general scientific facts, etc.). These will be handled by the GeneralAnswer node to filter out-of-domain queries.
    **CRUCIAL RULE**: If the message explicitly starts with or contains phrases like "what is", "explain", "tell me about", "define", or "how to" (when asking about a concept, not data display), it is almost certainly a "general_qa" intent, even if it contains financial terms. Prioritize this rule.

Respond with a JSON object like this:
{
  "intent_type": "financial_data" | "general_qa",
  "data_format": "table" | "chart" | "list" | "none",
  "data_query": "AAPL stock" | "tech sector" | "volume" | "none" // Add data_query example
}

**Example for "create a component":**
User message: "create a component"
{
  "intent_type": "financial_data",
  "data_format": "none",
  "data_query": "none"
}`;

  let intentType: 'financial_data' | 'general_qa' = 'general_qa';
  let dataFormat: FormatType | undefined = undefined;
  let dataQuery: string | undefined = undefined;

  try {
    const result = await gemini.generateContent(prompt);
    const text = result.response.text().trim();
    console.log('IntentAnalyzer Gemini raw response:', text);
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      console.log('IntentAnalyzer Gemini parsed output:', parsed);
      if (parsed.intent_type) {
        intentType = parsed.intent_type as 'financial_data' | 'general_qa';
        console.log(`IntentAnalyzer: intentType set to ${intentType} after parsing.`);
      } else {
        console.warn("IntentAnalyzer: parsed.intent_type is missing. Defaulting to general_qa.");
      }

      if (parsed.data_format) {
        const recognizedFormats: FormatType[] = ['table', 'chart', 'list'];
        if (recognizedFormats.includes(parsed.data_format)) {
            dataFormat = parsed.data_format;
        } else {
            console.warn(`Unrecognized or implicit data_format from Gemini: ${parsed.data_format}. Forcing to undefined.`);
            dataFormat = undefined;
        }
      }
      if (parsed.data_query && parsed.data_query !== 'none') {
          dataQuery = parsed.data_query;
      } else {
          dataQuery = undefined;
      }
    } else {
        // If JSON block not found, fall back to regex logic
        console.warn("Gemini response did not contain a JSON block. Falling back to regex logic.");
        if (/create a component/i.test(lastUserMsg)) {
            intentType = 'financial_data';
            dataFormat = undefined;
            dataQuery = undefined;
        } else if (/(what is|explain|tell me about|define|how to )/i.test(lastUserMsg)) {
            intentType = 'general_qa';
        } else if (/(show (me )?data|display|visualize|chart|table|list|financials)/i.test(lastUserMsg)) {
            intentType = 'financial_data';
            if (/table/i.test(lastUserMsg)) dataFormat = 'table';
            else if (/chart/i.test(lastUserMsg)) dataFormat = 'chart';
            else if (/list/i.test(lastUserMsg)) dataFormat = 'list';
            else dataFormat = undefined;

            const potentialDataQueryMatch = lastUserMsg.match(/(?:for|of)?\s+([A-Z]+(?:\s+stock)?|[a-zA-Z]+\s+sector|[a-zA-Z]+\s+metric)/i);
            if (potentialDataQueryMatch && potentialDataQueryMatch[1]) {
                dataQuery = potentialDataQueryMatch[1];
            } else if (/(AAPL|GOOGL|MSFT|AMZN|TSLA|NVDA|JPM|V|MA|PG|KO)/i.test(lastUserMsg)) {
                const symbolMatch = lastUserMsg.match(/(AAPL|GOOGL|MSFT|AMZN|TSLA|NVDA|JPM|V|MA|PG|KO)/i);
                if (symbolMatch) dataQuery = symbolMatch[1];
            } else {
                dataQuery = undefined;
            }
        } else {
            intentType = 'general_qa';
        }
    }
  } catch (e) {
    console.error("Gemini IntentAnalyzer processing error, falling back to regex:", e);
    // This catch block now primarily handles actual errors during content generation or unexpected structure
    // The primary fallback logic for missing JSON is now within the try block's else branch
    if (/create a component/i.test(lastUserMsg)) {
        intentType = 'financial_data';
        dataFormat = undefined;
        dataQuery = undefined;
    } else if (/(what is|explain|tell me about|define|how to )/i.test(lastUserMsg)) {
      intentType = 'general_qa';
    } else if (/(show (me )?data|display|visualize|chart|table|list|financials)/i.test(lastUserMsg)) {
      intentType = 'financial_data';
      if (/table/i.test(lastUserMsg)) dataFormat = 'table';
      else if (/chart/i.test(lastUserMsg)) dataFormat = 'chart';
      else if (/list/i.test(lastUserMsg)) dataFormat = 'list';
      else dataFormat = undefined;

      const potentialDataQueryMatch = lastUserMsg.match(/(?:for|of)?\s+([A-Z]+(?:\s+stock)?|[a-zA-Z]+\s+sector|[a-zA-Z]+\s+metric)/i);
      if (potentialDataQueryMatch && potentialDataQueryMatch[1]) {
          dataQuery = potentialDataQueryMatch[1];
      } else if (/(AAPL|GOOGL|MSFT|AMZN|TSLA|NVDA|JPM|V|MA|PG|KO)/i.test(lastUserMsg)) {
          const symbolMatch = lastUserMsg.match(/(AAPL|GOOGL|MSFT|AMZN|TSLA|NVDA|JPM|V|MA|PG|KO)/i);
          if (symbolMatch) dataQuery = symbolMatch[1];
      } else {
        dataQuery = undefined;
      }
    } else {
      intentType = 'general_qa';
    }
  }

  console.log(`IntentAnalyzer Debug: Final intentType: ${intentType}, dataFormat: ${dataFormat}, dataQuery: ${dataQuery}`);

  let nextNode: GraphState['next'];

  if (intentType === 'general_qa') {
    nextNode = 'GeneralAnswer';
  } else if (intentType === 'financial_data') {
    if (dataFormat !== undefined && dataQuery !== undefined) {
      nextNode = 'Executor';
    }
    else if (dataFormat === undefined && dataQuery !== undefined) {
      nextNode = 'Clarifier';
    }
    else if (dataFormat !== undefined && dataQuery === undefined) {
      nextNode = 'DataClarifier';
    }
    else if (dataFormat === undefined && dataQuery === undefined) {
      nextNode = 'Clarifier';
    }
    else {
      nextNode = 'Clarifier';
    }
  } else {
    nextNode = 'GeneralAnswer';
  }

  const returnedState: Partial<GraphState> = {
    next: nextNode,
    selection: dataFormat !== undefined ? dataFormat : state.selection,
    dataQuery: dataQuery !== undefined ? dataQuery : state.dataQuery,
  };
  console.log('IntentAnalyzer: Returning state:', JSON.stringify(returnedState));
  return returnedState;
};

// --- Node 2: Clarifier ---
const Clarifier = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log('Clarifier node entered. Current state:', JSON.stringify(state));
  console.log('Clarifier node: state.selection is', state.selection);

  if (state.selection) {
    console.log('Clarifier node: selection found, transitioning to DataClarifier.', state.selection);
    return { next: 'DataClarifier', selection: state.selection, dataQuery: state.dataQuery };
  } else {
    console.log(`Clarifier node: No selection, generating clarification response and transitioning to ResponseFormatter.`);
    return {
      response: { type: 'clarify', options: ['table', 'chart', 'list'], content: 'Please specify the format you would like: table, chart, or list.' },
      next: 'ResponseFormatter',
    };
  }
};

// --- Node X: Data Clarifier (NEW) ---
const DataClarifier = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log('DataClarifier node entered. Current state:', JSON.stringify(state));
  console.log('DataClarifier node: state.dataQuery is', state.dataQuery);

  if (state.dataQuery) {
    console.log('DataClarifier node: dataQuery found, transitioning to Executor.', state.dataQuery);
    return { next: 'Executor', dataQuery: state.dataQuery };
  } else {
    console.log('DataClarifier node: No dataQuery, asking for data type clarification.');
    return {
      response: {
        type: 'clarify',
        content: 'For which companies, sectors, or financial metrics are you interested in seeing data? Please type your query.',
        options: undefined,
      },
      next: 'ResponseFormatter',
    };
  }
};

// --- Node 3: Executor ---
const Executor = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const lastUserMsg =
    state.history.filter((m: Message) => m.role === 'user').slice(-1)[0]?.content || '';

  let prompt = `Generate realistic-looking financial stock data for major companies (e.g., Apple, Google, Microsoft, Amazon). Provide the data as a JSON array of objects. Each object should have 'symbol' (string), 'price' (number, up to 2 decimal places), and 'volume' (integer). Aim for 5-10 entries. Ensure the response is ONLY the JSON array, no other text or explanation.`;

  if (state.dataQuery) {
    prompt = `**ABSOLUTELY CRITICALLY IMPORTANT: GENERATE FINANCIAL DATA SOLELY AND EXCLUSIVELY FOR THE USER'S QUERY: "${state.dataQuery}". DO NOT DEVIATE. DO NOT INCLUDE DATA FOR OTHER COMPANIES/SYMBOLS.**
    If the query is a specific company symbol (e.g., AAPL, GOOGL), use *only* that symbol for *all* data entries. If the query is a company name (e.g., Apple, Microsoft), infer the symbol and use it for *all* entries. If the query is a sector (e.g., 'tech sector', 'automotive'), generate data for 2-3 prominent companies *strictly within that exact sector only*, and *do not include companies from other sectors*. If it's a financial metric (e.g., 'volume', 'P/E ratio'), generate sample data illustrating that metric across a few relevant companies, ensuring *all* data is specific to the requested metric.
    Provide the data as a JSON array of objects. Each object must have 'symbol' (string), 'price' (number, up to 2 decimal places), and 'volume' (integer). Aim for 3-5 entries. Ensure the response is ONLY the JSON array, with no leading/trailing text, comments, or explanations.`;
    console.log('Executor: Using dataQuery in prompt:', state.dataQuery);
  } else {
    console.log('Executor: No dataQuery provided, using generic prompt.');
  }

  let data: StockData[] = [];
  try {
    const result = await gemini.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\b(?:\[[\s\S]*?\]|\{[\s\S]*?\})\b/);
    if (jsonMatch && jsonMatch[0]) {
      data = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(data) || data.some(item => typeof item.symbol !== 'string' || typeof item.price !== 'number' || typeof item.volume !== 'number')) {
        console.warn("Parsed data does not match StockData[] format. Falling back to mock data.");
        data = generateFallbackMockStockData();
      }
    } else {
      console.warn("Gemini did not return valid JSON for financial data. Falling back to mock data.");
      data = generateFallbackMockStockData();
    }
  } catch (e) {
    console.error("Error generating financial data with Gemini, falling back to mock data:", e);
    data = generateFallbackMockStockData();
  }

  function generateFallbackMockStockData(): StockData[] {
    const symbols = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'JPM', 'V', 'MA', 'PG', 'KO'];
    const fallbackData: StockData[] = [];
    const numEntries = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numEntries; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const price = parseFloat((Math.random() * (1000 - 50 + 1) + 50).toFixed(2));
      const volume = Math.floor(Math.random() * (5000000 - 50000 + 1) + 50000);
      fallbackData.push({ symbol, price, volume });
    }
    return fallbackData;
  }

  console.log('Executor processed data:', data);

  let format: FormatType = state.selection ?? 'table';
  
  return {
    response: { type: 'data', data, format },
    next: 'ResponseFormatter',
  };
};

// --- Node: GeneralAnswer ---
const GeneralAnswer = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  const lastUserMsg =
    state.history.filter((m: Message) => m.role === 'user').slice(-1)[0]?.content || '';

  const domainCheckPrompt = `You are a highly specialized AI assistant for financial data visualization. Your capabilities are strictly confined to financial data visualization requests and *brief, direct answers to related financial concepts/definitions*. You are NOT a general knowledge chatbot. Your core purpose is financial data visualization. 

Analyze the user's message: "${lastUserMsg}".

Determine if this message is **relevant** to your specific financial data visualization domain:

*   **Relevant (IN_DOMAIN)**: If the message is about financial concepts/definitions (e.g., "what is stock volume?", "explain market capitalization"), or is a direct request related to financial data, companies, or how to visualize data.
*   **Irrelevant (OUT_OF_DOMAIN)**: If the message is *completely unrelated* to finance, data, or visualization. This includes, but is not limited to, asking about: cooking recipes, sports scores, historical events, current news (non-financial), personal opinions, general scientific facts, or any topic outside a business/finance/data context.

Respond with only "OUT_OF_DOMAIN" or "IN_DOMAIN". Ensure you are strict about "OUT_OF_DOMAIN" if it clearly falls outside your narrow specialization.`;

  let domainStatus: 'OUT_OF_DOMAIN' | 'IN_DOMAIN' = 'IN_DOMAIN';
  try {
    const result = await gemini.generateContent(domainCheckPrompt);
    const text = result.response.text().trim().toUpperCase();
    console.log('GeneralAnswer Domain Check raw response:', text);
    if (text === 'OUT_OF_DOMAIN') {
      domainStatus = 'OUT_OF_DOMAIN';
    } else if (text === 'IN_DOMAIN') {
      domainStatus = 'IN_DOMAIN';
    } else {
      console.warn('GeneralAnswer Domain Check received unrecognized response, defaulting to IN_DOMAIN:', text);
      domainStatus = 'IN_DOMAIN';
    }
  } catch (e) {
    console.error("Gemini domain check error, assuming IN_DOMAIN:", e);
    domainStatus = 'IN_DOMAIN';
  }

  let answer = '';
  if (domainStatus === 'OUT_OF_DOMAIN') {
    answer = 'I apologize, but my current capabilities are focused on financial data visualization and related queries. Please ask me about financial data, companies, or how to display data.';
  } else {
    try {
      const qaPrompt = `Answer the following financial or data-related question concisely, keeping in mind your role as a financial data assistant. If the question implies general knowledge beyond simple definitions or direct financial concepts, state that it's outside your core focus but provide a brief, helpful answer if possible.

Question: "${lastUserMsg}"`;
      const result = await gemini.generateContent(qaPrompt);
      answer = result.response.text();
      console.log('GeneralAnswer response content:', answer);
    } catch (e) {
      console.error('Error generating general answer with Gemini:', e);
      answer = 'Sorry, I could not answer that. It might be outside my core financial data visualization scope or an error occurred.';
    }
  }
  return {
    response: { type: 'general', content: answer },
    next: 'ResponseFormatter',
  };
};

// --- Node 4: Response Formatter ---
const ResponseFormatter = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  if (state.response?.type === 'data') {
    const lastUserMsg = state.history.filter((m: Message) => m.role === 'user').slice(-1)[0]?.content || 'the requested data';
    const messageContent = `Responding to your query: "${lastUserMsg}". Here is the financial data in ${state.response.format || 'table'} format.`;
    return { response: { ...state.response, content: messageContent } };
  } else if (state.response?.type === 'general') {
    return { response: { ...state.response, content: state.response.content || '' } };
  } else if (state.response?.type === 'clarify') {
    return { response: state.response };
  }
  return { response: { type: 'general', content: 'An unexpected response was received.' } };
};

// --- Build & Compile the Graph ---
export const graph = new StateGraph<GraphState>({
  channels: {
    history: {
      reducer: (x: Message[], y: Message[]) => x.concat(y),
      default: () => [],
    },
    selection: {
      reducer: (x: FormatType | undefined, y: FormatType | undefined) => y,
      default: () => undefined,
    },
    dataQuery: {
      reducer: (x: string | undefined, y: string | undefined) => y,
      default: () => undefined,
    },
    response: {
      reducer: (x: any, y: any) => y,
      default: () => undefined,
    },
    next: {
      reducer: (x: GraphState['next'], y: GraphState['next']) => y,
      default: () => undefined,
    },
  },
})
  .addNode('IntentAnalyzer', IntentAnalyzer)
  .addNode('Clarifier', Clarifier)
  .addNode('DataClarifier', DataClarifier)
  .addNode('Executor', Executor)
  .addNode('GeneralAnswer', GeneralAnswer)
  .addNode('ResponseFormatter', ResponseFormatter)
  .addEdge(START, 'IntentAnalyzer')
  .addConditionalEdges(
    'IntentAnalyzer',
    (state: GraphState) => state.next!,
    { Clarifier: 'Clarifier', Executor: 'Executor', GeneralAnswer: 'GeneralAnswer', DataClarifier: 'DataClarifier' }
  )
  .addConditionalEdges(
    'Clarifier',
    (state: GraphState) => state.next!,
    { DataClarifier: 'DataClarifier', ResponseFormatter: 'ResponseFormatter' }
  )
  .addConditionalEdges(
    'DataClarifier',
    (state: GraphState) => state.next!,
    { Executor: 'Executor', ResponseFormatter: 'ResponseFormatter' }
  )
  .addEdge('Executor', 'ResponseFormatter')
  .addEdge('GeneralAnswer', 'ResponseFormatter')
  .addEdge('ResponseFormatter', END)
  .compile();

// ✅ Usage:
// const result = await graph.invoke({ history: [], selection: undefined });
