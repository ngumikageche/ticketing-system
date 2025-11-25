import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConversationList from './ConversationList.jsx';
import ChatInterface from './ChatInterface.jsx';
import ComponentErrorBoundary from './ComponentErrorBoundary.jsx';

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get('conversation');

  return (
    <div className="min-h-screen h-screen flex bg-gray-50 overflow-auto">
      {/* Mobile: Show only conversation list or chat interface */}
  <div className="flex w-full h-full">
    <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 h-full min-h-0 overflow-y-auto`}>
          <ConversationList
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?.id}
            initialConversationId={initialConversationId}
          />
        </div>
        {selectedConversation && (
          <div className="flex-1 h-[75vh] md:h-[80vh] min-h-0">
            <ComponentErrorBoundary
              fallbackMessage="Chat interface encountered an error. Please refresh to continue chatting."
            >
              <ChatInterface 
                conversation={selectedConversation} 
                onBack={() => setSelectedConversation(null)}
              />
            </ComponentErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;