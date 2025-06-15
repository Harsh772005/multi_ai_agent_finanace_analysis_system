import React from 'react';
import { Message } from '@/lib/langgraph';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface CustomCodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: any; // `node`
}

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const isGeneral = message.type === 'general';
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`px-5 py-3 rounded-xl max-w-[75%] whitespace-pre-line text-lg shadow-lg transition-all duration-300 ease-in-out
          ${isUser
            ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white self-end transform hover:scale-105'
            : isGeneral
              ? 'bg-gray-100 text-gray-800 border-l-4 border-indigo-500 shadow-md'
              : 'bg-white text-gray-800 border border-gray-200 shadow-sm'}
        `}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: CustomCodeProps) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <pre className="overflow-x-auto rounded-md bg-gray-700 p-2 font-mono text-sm text-white">
                  <code className={`language-${match[1]}`} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className={`bg-gray-100 rounded px-1 font-mono text-sm ${className || ''}`} {...props}>
                    {children}
                  </code>
                );
              },
            h1: (props) => <h1 className="text-2xl font-bold mt-4 mb-2" {...props} />,
            h2: (props) => <h2 className="text-xl font-bold mt-3 mb-1" {...props} />,
            p: (props) => <p className="mb-2" {...props} />,
            ul: (props) => <ul className="list-disc list-inside mb-2 pl-4" {...props} />,
            ol: (props) => <ol className="list-decimal list-inside mb-2 pl-4" {...props} />,
            li: (props) => <li className="mb-1" {...props} />,
            strong: (props) => <strong className="font-semibold" {...props} />,
            em: (props) => <em className="italic" {...props} />,
            a: (props) => <a className="text-blue-500 hover:underline" {...props} />,
            table: (props) => (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-gray-300" {...props} />
              </div>
            ),
            th: (props) => <th className="border border-gray-300 bg-gray-200 px-4 py-2 text-left" {...props} />,
            td: (props) => <td className="border border-gray-300 px-4 py-2" {...props} />,
            
          }}
      >
        {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MessageBubble;