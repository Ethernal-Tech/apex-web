import { useState, useEffect } from 'react';
import { IRepSystemMessage, repSystemMessages } from './reputationData';

// Function to get a random reputation system message
const getRandomRepSystemMessage = (): IRepSystemMessage => {
  return repSystemMessages[Math.floor(Math.random() * repSystemMessages.length)];
};

// Custom hook
const useRepSystemMessage = () => {
  const [repSystemMessage, setRepSystemMessage] = useState<IRepSystemMessage | undefined>(undefined);

  useEffect(() => {
    if (!repSystemMessage) {
      // Set the title and subtitle to be used for reputation system promotion
      const message: IRepSystemMessage = getRandomRepSystemMessage();
      setRepSystemMessage(message);
    }
  }, [repSystemMessage]);

  return repSystemMessage;
};

export default useRepSystemMessage;
