import fs from 'fs';
import path from 'path';
import { Message, FormatType, StockData, VisualizationHistoryItem } from '@/lib/langgraph';

const SESSIONS_FILE = path.resolve(process.cwd(), 'sessions.json');
console.log(`Session file path: ${SESSIONS_FILE}`);

export interface SessionData {
  history: Message[];
  visualizationHistory: VisualizationHistoryItem[];
  selection?: FormatType;
  dataQuery?: string;
}

// Ensure the sessions file exists
if (!fs.existsSync(SESSIONS_FILE)) {
  console.log('sessions.json does not exist. Creating new file.');
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}), 'utf8');
}

const loadSessionsInternal = (): Map<string, SessionData> => {
  try {
    console.log('Attempting to load sessions from file...');
    const data = fs.readFileSync(SESSIONS_FILE, 'utf8');
    const obj = JSON.parse(data);
    console.log('Loaded sessions raw data:', obj);
    return new Map<string, SessionData>(Object.entries(obj));
  } catch (error) {
    console.error('Error loading sessions from file:', error);
    return new Map();
  }
};

export const saveSessions = (sessions: Map<string, SessionData>) => {
  try {
    console.log('Attempting to save sessions to file. Sessions count:', sessions.size);
    const obj = Object.fromEntries(sessions);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf8');
    console.log('Sessions saved successfully.');
  } catch (error) {
    console.error('Error saving sessions to file:', error);
  }
};

export const sessions: Map<string, SessionData> = loadSessionsInternal(); 