# Financial Chatbot Multi-Agent System

Welcome to the Multi-Agent System for Financial Data Visualization! This project aims to provide an intelligent chatbot that can understand your requests for financial data and visualize it in various formats.

## Project Objective

To create a full-stack multi-agent system using LangGraph and Next.js that intelligently handles user queries related to displaying financial data. The system should process specific requests, recognize when more information is needed, and provide an intuitive web interface.

## Technical Stack

*   **Backend**: LangGraph + LangChain (Node.js/TypeScript) built within Next.js API routes.
*   **Frontend**: Next.js (React/TypeScript).
*   **Language**: TypeScript.
*   **Styling**: Tailwind CSS (as inferred from the project structure).

## Setup Instructions

To get this project up and running on your local machine, follow these steps:

1.  **Clone the Repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd <your-project-directory>
    ```

2.  **Install Dependencies:**
    Navigate to the project root directory in your terminal and install the necessary Node.js packages:
    ```bash
    npm install
    # or yarn install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of your project and add your Google Gemini API key. This key is crucial for the AI model to function.
    ```
    GOOGLE_API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    Replace `YOUR_GEMINI_API_KEY_HERE` with your actual Google Gemini API Key. You can obtain one from the Google AI Studio or Google Cloud Console.

4.  **Run the Development Server:**
    Start the Next.js development server:
    ```bash
    npm run dev
    # or yarn dev
    ```

    The application should now be running at `http://localhost:3000`.

## Core System Intelligence

This system uses a unified multi-agent LangGraph system to analyze user input and determine the appropriate response path. It handles both specific requests and ambiguous queries seamlessly.

### Agent Components:

*   **Intent Analyzer**: Parses user messages to determine the user's intent (e.g., financial data visualization, general question) and extracts relevant details like data format and data query.
*   **Clarifier**: Engages with the user to get missing information, such as the desired visualization format (table, chart, list) when not specified.
*   **Data Clarifier**: Prompts the user for specific data queries (company, sector, metric) if they are missing.
*   **Executor**: Generates mock financial data based on the user's request and format, and handles out-of-domain queries.
*   **Response Formatter**: Structures the agent's output for clean display on the frontend.

## Example User Interactions & Expected Flow

Here are some test cases to demonstrate the system's expected behavior:

### Scenario 1: Specific Request

*   **User Input**: `visualize the table for AAPL stock`
*   **Expected System Behavior**:
    1.  The `IntentAnalyzer` recognizes clear intent, specified format (`table`), and data query (`AAPL stock`).
    2.  Directly routes to `Executor`.
    3.  Generates realistic stock data for `AAPL` in a table format.
    4.  Frontend displays the table.

### Scenario 2: Ambiguous Request - Missing Format, Provided Data

*   **User Input**: `show me some data for Google`
*   **Expected System Behavior**:
    1.  The `IntentAnalyzer` recognizes `financial_data` intent and `data_query` (`Google`), but `data_format` is missing.
    2.  Routes to `Clarifier`.
    3.  System responds: `Please specify the format you would like: table, chart, or list.` with interactive options.
    4.  User selects `Table`.
    5.  The system then proceeds to `Executor`.
    6.  Generates realistic stock data for `GOOGL` in a table format.
    7.  Frontend displays the table.

### Scenario 3: Ambiguous Request - Missing Format and Data

*   **User Input**: `show me some data`
*   **Expected System Behavior**:
    1.  The `IntentAnalyzer` recognizes `financial_data` intent, but both `data_format` and `data_query` are missing.
    2.  Routes to `Clarifier`.
    3.  System responds: `Please specify the format you would like: table, chart, or list.` with interactive options.
    4.  User selects `Table`.
    5.  The system then routes to `DataClarifier`.
    6.  System responds: `For which companies, sectors, or financial metrics are you interested in seeing data? Please type your query.`
    7.  User types `Microsoft`.
    8.  The system then proceeds to `Executor`.
    9.  Generates realistic stock data for `MSFT` in a table format.
    10. Frontend displays the table.

### Scenario 4: Ambiguous Request - "Create a component"

*   **User Input**: `create a component`
*   **Expected System Behavior**:
    1.  The `IntentAnalyzer` classifies this as `financial_data` with no format or data query.
    2.  Routes to `Clarifier`.
    3.  System responds: `Please specify the format you would like: table, chart, or list.` with interactive options.
    4.  User selects `Chart`.
    5.  The system then routes to `DataClarifier`.
    6.  System responds: `For which companies, sectors, or financial metrics are you interested in seeing data? Please type your query.`
    7.  User types `TSLA`.
    8.  The system then proceeds to `Executor`.
    9.  Generates realistic stock data for `TSLA` in a chart format.
    10. Frontend displays the chart.

### Scenario 5: Out-of-Domain Request

*   **User Input**: `what is the capital of France?`
*   **Expected System Behavior**:
    1.  The `IntentAnalyzer` classifies this as `general_qa`.
    2.  Routes to `GeneralAnswer`.
    3.  System responds: `I apologize, but my current capabilities are focused on financial data visualization and related queries. Please ask me about financial data, companies, or how to display data.`

## Known Limitations

*   The system currently uses mock financial data; integration with real-time financial APIs is a future enhancement.
*   The natural language understanding is dependent on the prompt engineering and the capabilities of the Gemini model. More complex or nuanced financial queries might require further prompt refinement.

## Features to Add with More Time

*   Integration with live financial data APIs (e.g., Alpha Vantage, Finnhub).
*   Support for more visualization types (e.g., line charts, bar charts, candlestick charts).
*   Ability to save and retrieve previous visualizations.
*   User authentication and personalized chat history.
*   More robust error handling and user feedback for API failures.
*   Improved natural language understanding for a wider range of financial queries.
*   Implementing a `Summary` component to provide a textual summary of the data.

## Performance Considerations

*   The current setup involves multiple API calls (Gemini for intent analysis and data generation). For production, consider caching mechanisms for frequently requested data and optimizing LLM calls.
*   Frontend rendering performance for large datasets should be monitored and optimized if necessary.

## Features

- 🤖 Intelligent Multi-Agent System using LangGraph
- 💬 Natural Language Processing for user queries
- 📊 Dynamic Data Visualization (Tables, Charts)
- 🎯 Smart Query Analysis and Clarification
- 💻 Modern Next.js Frontend
- 🔄 Real-time Chat Interface

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: LangGraph, LangChain
- **Styling**: Tailwind CSS
- **Markdown Rendering**: react-markdown, remark-gfm

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.9+ (for LangGraph)

## Project Structure

```
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/             # LangGraph and utility functions
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
└── package.json         # Project dependencies
```

## Usage

1. Start the application and navigate to the chat interface
2. Enter queries like:
   - "Show me financial data using a table"
   - "Create a component"
   - "Display stock prices in a chart"

## Known Limitations

- Chat history is currently session-based
- Limited to financial data visualization
- Requires GOOGLE GEMINI API KEY


## License

This project is licensed under the MIT License - see the LICENSE file for details.
