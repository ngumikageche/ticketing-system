import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ConversationList from './ConversationList.jsx';
import ChatInterface from './ChatInterface.jsx';

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get('conversation');

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      {/* Mobile: Show only conversation list or chat interface */}
      <div className="flex w-full md:w-auto h-full">
        <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80 h-full`}>
          <ConversationList
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?.id}
            initialConversationId={initialConversationId}
          />
        </div>
        {selectedConversation && (
          <div className="flex-1 md:flex-none md:w-full h-full">
            <ChatInterface 
              conversation={selectedConversation} 
              onBack={() => setSelectedConversation(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;