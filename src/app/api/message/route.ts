import { NextRequest, NextResponse } from 'next/server';
import { graph } from '@/lib/langgraph';
import { sessions, saveSessions, SessionData } from '@/lib/sessionStore';
import { Message, AgentResponse, FormatType, StockData, VisualizationHistoryItem } from '@/lib/langgraph';
import { GraphState } from '@/lib/langgraph';

export const dynamic = 'force-dynamic';

// GET handler for fetching session history
export async function GET(req: NextRequest) {
  console.log('Backend: API route /api/message (GET) called.');
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const currentSession = sessions.get(sessionId);

  if (!currentSession) {
    console.log('Backend: Session not found for ID:', sessionId);
    return NextResponse.json({ history: [], visualizationHistory: [] }, { status: 200 });
  }

  console.log('Backend: Fetched session history for ID:', sessionId, 'length:', currentSession.history.length);
  return NextResponse.json({
    history: currentSession.history,
    visualizationHistory: currentSession.visualizationHistory,
  }, { status: 200 });
}

// POST handler for sending messages and processing with LangGraph
export async function POST(req: NextRequest) {
  console.log('Backend: API route /api/message (POST) called.');
  const { message, sessionId: clientSessionId, selection, dataQuery }: {
    message?: string;
    sessionId?: string;
    selection?: FormatType;
    dataQuery?: string;
  } = await req.json();

  console.log('Backend: Received payload:', { message, clientSessionId, selection, dataQuery });
  console.log('Backend: Current sessions map size (before processing):', sessions.size);

  let sessionId = clientSessionId;
  let currentSession: SessionData;

  if (sessionId && sessions.has(sessionId)) {
    currentSession = sessions.get(sessionId)!;
    console.log('Backend: Existing session found:', sessionId);
  } else {
    sessionId = crypto.randomUUID();
    // Initialize visualizationHistory as an empty array for new sessions
    currentSession = { history: [], visualizationHistory: [], selection: undefined, dataQuery: undefined };
    sessions.set(sessionId, currentSession);
    console.log('Backend: New session created:', sessionId);
  }

  // Add user message to history if provided
  if (message) {
    console.log('Backend: Adding user message to session history.');
    currentSession.history.push({ role: 'user', content: message });
  }

  // Update session with selection and dataQuery if provided from frontend
  // IMPORTANT: These updates should persist until a full response is given.
  if (selection !== undefined) {
    currentSession.selection = selection;
    console.log('Backend: Storing selection in session:', selection);
  }
  if (dataQuery !== undefined) {
    currentSession.dataQuery = dataQuery;
    console.log('Backend: Storing dataQuery in session:', dataQuery);
  }

  // Construct inputState for LangGraph, using persisted session values
  let inputState: {
    history: Message[];
    selection?: FormatType;
    dataQuery?: string;
    response?: AgentResponse;
    visualizationHistory?: VisualizationHistoryItem[]; // Pass history to graph if needed
  } = {
    history: currentSession.history,
    selection: currentSession.selection, // Use persisted selection
    dataQuery: currentSession.dataQuery,   // Use persisted dataQuery
    visualizationHistory: currentSession.visualizationHistory, // Pass history to graph
  };

  // Save sessions here to ensure the latest selection/dataQuery is persisted before graph execution
  saveSessions(sessions);
  console.log('Backend: Session state updated and saved before graph execution.', currentSession);

  try {
    console.log('Backend: Invoking graph with input state. History length:', inputState.history.length, 'Selection:', inputState.selection, 'DataQuery:', inputState.dataQuery);
    // Execute the graph
    const stream = await graph.stream(inputState);

    let finalState: GraphState = { history: [] }; // Initialize with a default empty state
    for await (const chunk of stream) {
      console.log('Backend: Raw chunk from stream:', JSON.stringify(chunk, null, 2)); // NEW LOG for raw chunk
      finalState = chunk; // Each chunk is the current state
      if (finalState.response?.type === 'clarify') {
        console.log('Backend: Clarify response received in finalState. Breaking stream.');
        break; // Break if clarification is needed
      }
    }

    // Correctly extract finalResponse from the nested structure if ResponseFormatter was the last node
    let finalResponse: AgentResponse | undefined = finalState.ResponseFormatter?.response || finalState.response;

    console.log('Backend: Final state captured before sending response:', JSON.stringify(finalState, null, 2));

    if (finalResponse) {
      console.log('Backend: Final response before history push:', JSON.stringify(finalResponse, null, 2));
      currentSession.history.push({ role: 'bot', content: finalResponse.content || '' });

      if (finalResponse.type === 'data') {
        console.log('Backend: Final response type: data. Saving visualization data to history.');
        // Add new visualization to history with timestamp
        currentSession.visualizationHistory.push({
          type: 'data',
          format: finalResponse.format as FormatType,
          data: finalResponse.data as StockData[],
          content: finalResponse.content || '',
          timestamp: new Date().toISOString(),
        });
        currentSession.selection = undefined;
        currentSession.dataQuery = undefined;
      } else if (finalResponse.type === 'general') {
        console.log('Backend: Final response type: general. Clearing current visualization (as it\'s general).');
        // For general responses, we might not want to clear the whole history, but ensure no 'current' visualization
        // For now, we'll just not add to visualizationHistory, but keep existing.
        currentSession.selection = undefined;
        currentSession.dataQuery = undefined;
      } else if (finalResponse.type === 'clarify') {
        console.log('Backend: Final response type: clarify.');
        // Clarify type means no new visualization is generated, so keep existing history.
      }
    } else {
      // Handle case where finalResponse is undefined (e.g., empty stream or no response from agent)
      finalResponse = { type: 'general', content: 'No response from agent.' };
      currentSession.history.push({ role: 'bot', content: finalResponse.content || '' });
    }

    saveSessions(sessions);
    console.log('Backend: Session state saved after graph execution.', currentSession);

    return NextResponse.json({
      sessionId: sessionId,
      response: finalResponse,
      history: currentSession.history,
      visualizationHistory: currentSession.visualizationHistory, // Return updated visualization history
    }, { status: 200 });
  } catch (error: any) {
    console.error('Backend: Error during graph execution:', error);
    currentSession.history.push({ role: 'bot', content: `Error: ${error.message}` });
    saveSessions(sessions);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE handler for clearing session history
export async function DELETE(req: NextRequest) {
  console.log('Backend: API route /api/message (DELETE) called.');
  const { sessionId }: { sessionId?: string } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    saveSessions(sessions);
    console.log('Backend: Session ', sessionId, ' cleared and removed from store.');
    return NextResponse.json({ message: 'Session history cleared successfully.' }, { status: 200 });
  } else {
    console.log('Backend: Attempted to clear non-existent session ', sessionId);
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }
}
