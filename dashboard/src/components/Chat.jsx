import { useState } from 'react';
import ConversationList from './ConversationList.jsx';
import ChatInterface from './ChatInterface.jsx';

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile: Show only conversation list or chat interface */}
      <div className="flex w-full md:w-auto">
        <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-80`}>
          <ConversationList
            onSelectConversation={setSelectedConversation}
            selectedConversationId={selectedConversation?.id}
          />
        </div>
        {selectedConversation && (
          <div className="flex-1 md:flex-none md:w-full">
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