import { useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { saveConversations } from '@/utils/app/conversation';

import { Conversation } from '@/types/chat';
import { SupportedExportFormats } from '@/types/export';
import { OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';

import HomeContext from '@/home/home.context';

import { ChatFolders } from './components/ChatFolders';
import { Conversations } from './components/Conversations';

import Sidebar from '../Sidebar';
import ChatbarContext from './Chatbar.context';
import { ChatbarInitialState, initialState } from './Chatbar.state';

import { v4 as uuidv4 } from 'uuid';
import {FolderInterface, SortType} from "@/types/folder";
import { getIsLocalStorageSelection, isLocalConversation, isRemoteConversation } from '@/utils/app/conversationStorage';
import { deleteRemoteConversation } from '@/services/remoteConversationService';
import { uncompressMessages } from '@/utils/app/messages';
import { getDateName } from '@/utils/app/date';


export const Chatbar = () => {
  const { t } = useTranslation('sidebar');

  const chatBarContextValue = useCreateReducer<ChatbarInitialState>({
    initialState,
  });

  const {
    state: { conversations, showChatbar, defaultModelId, statsService, folders, storageSelection},
    dispatch: homeDispatch,
    handleCreateFolder,
    handleNewConversation,
    handleUpdateConversation,
  } = useContext(HomeContext);

  const conversationsRef = useRef(conversations);

  useEffect(() => {
      conversationsRef.current = conversations;
  }, [conversations]);

  const foldersRef = useRef(folders);

  useEffect(() => {
      foldersRef.current = folders;
  }, [folders]);

  const {
    state: { searchTerm, filteredConversations },
    dispatch: chatDispatch,
  } = chatBarContextValue;


  const [folderSort, setFolderSort] = useState<SortType>('date');


  const handleShareFolder = (folder: FolderInterface) => {

  }

  const handleExportData = () => {

  };

  const handleImportConversations = (data: SupportedExportFormats) => {

  };

  const handleClearConversations = () => {

  };

  const handleDeleteConversation = (conversation: Conversation) => {

    if (isRemoteConversation(conversation)) deleteRemoteConversation(conversation.id);
    
    const updatedConversations = conversationsRef.current.filter(
      (c) => c.id !== conversation.id,
    );

    statsService.deleteConversationEvent(conversation);

    const updatedLength = updatedConversations.length;
    if (updatedLength > 0) {
    let lastConversation = updatedConversations[updatedLength - 1];
    

    let selectedConversation: Conversation = {...lastConversation};
    if (lastConversation.name !== 'New Conversation' && (conversation.name !== 'New Conversation')) { // handle if you delete this new conversation 
      
      const date = getDateName();

      // See if there is a folder with the same name as the date
      let folder = foldersRef.current.find((f: FolderInterface) => f.name === date);
      if (!folder) {
          folder = handleCreateFolder(date, "chat");
      }
      
      const newConversation: Conversation = {
        id: uuidv4(),
        name: t('New Conversation'),
        messages: [],
        model: lastConversation?.model ?? OpenAIModels[defaultModelId as OpenAIModelID],
        prompt: DEFAULT_SYSTEM_PROMPT,
        temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
        folderId: folder.id,
        promptTemplate: null
      };
      updatedConversations.push(newConversation)
      selectedConversation = {...newConversation}
    }

    localStorage.setItem('selectedConversation', JSON.stringify(selectedConversation))
    homeDispatch({ field: 'selectedConversation', value: selectedConversation});

    } else {
      defaultModelId &&
      homeDispatch({
          field: 'selectedConversation',
          value: {
              id: uuidv4(),
              name: t('New Conversation'),
              messages: [],
              model: conversation.model,
              prompt: DEFAULT_SYSTEM_PROMPT,
              temperature: conversation.temperature,
              folderId: null,
              isLocal: getIsLocalStorageSelection(storageSelection) 
          },
      });

      localStorage.removeItem('selectedConversation');
  }

    homeDispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);
    chatDispatch({ field: 'searchTerm', value: '' });
    
  };

  const handleToggleChatbar = () => {
    homeDispatch({ field: 'showChatbar', value: !showChatbar });
    localStorage.setItem('showChatbar', JSON.stringify(!showChatbar));
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const conversation = JSON.parse(e.dataTransfer.getData('conversation'));
      handleUpdateConversation(conversation, { key: 'folderId', value: 0 });
      chatDispatch({ field: 'searchTerm', value: '' });
      e.target.style.background = 'none';
    }
  };

  useEffect(() => {

    statsService.openConversationsEvent();

    if (searchTerm) {

      statsService.searchConversationsEvent(searchTerm);

      const results = conversations.filter((conversation) => {
        let messages = '';
        if (isLocalConversation(conversation)) {
          //uncompress messages 
          const uncompressedMs = uncompressMessages(conversation.compressedMessages?? []);
          if (uncompressedMs) messages = uncompressedMs.map((message) => message.content).join(' ');
        }
        // remote messages are currently unsearchable NOTE
        const searchable =
            conversation.name.toLocaleLowerCase() +  ' ' + messages
        return searchable.toLowerCase().includes(searchTerm.toLowerCase());
      });

      chatDispatch({
        field: 'filteredConversations',
        value: results,}
      );
    } else {

      chatDispatch({
        field: 'filteredConversations',
        value: conversations,
      });
    }
  }, [searchTerm, conversations]);

  return (
    <ChatbarContext.Provider
      value={{
        ...chatBarContextValue,
        handleDeleteConversation,
        handleClearConversations,
        handleImportConversations,
        handleExportData,
        handleShareFolder,
      }}
    >
      <Sidebar<Conversation>
        side={'left'}
        isOpen={showChatbar}
        addItemButtonTitle={t('New Chat')}
        itemComponent={<Conversations conversations={filteredConversations} />}
        folderComponent={<ChatFolders sort={folderSort} searchTerm={searchTerm} conversations={filteredConversations} />}
        items={filteredConversations}
        searchTerm={searchTerm}
        handleSearchTerm={(searchTerm: string) => chatDispatch({ field: 'searchTerm', value: searchTerm })}
        toggleOpen={handleToggleChatbar}
        handleCreateItem={() => {
          handleNewConversation({});
        } }
        handleCreateFolder={() => {
          const name = window.prompt("Folder name:");
          handleCreateFolder(name || "New Folder", 'chat');
        } }
        handleDrop={handleDrop}
        footerComponent={<> </>} 
        handleCreateAssistantItem={() => {}} 
        setFolderSort={setFolderSort} 
        />
    </ChatbarContext.Provider>
  );
};
