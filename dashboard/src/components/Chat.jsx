import { useState } from 'react';
import ConversationList from './ConversationList.jsx';
import ChatInterface from './ChatInterface.jsx';

const Chat = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);

  return (
    <div className="h-screen flex bg-gray-50">
      <ConversationList
        onSelectConversation={setSelectedConversation}
        selectedConversationId={selectedConversation?.id}
      />
      <ChatInterface conversation={selectedConversation} />
    </div>
  );
};

export default Chat;