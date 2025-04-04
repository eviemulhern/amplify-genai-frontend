import { FC, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import HomeContext from '@/pages/api/home/home.context';
import { Modal } from '../ReusableComponents/Modal';
import { IconBrandTeams, IconLoader2, IconMailOpened, IconNotebook, IconUsers } from '@tabler/icons-react';
import {
  IconBrandGoogleDrive,
  IconBrandGmail,
  IconFileSpreadsheet,
  IconFileText,
  IconForms,
  IconCheck,
  IconBrandOffice
} from '@tabler/icons-react';
import { deleteUserIntegration, getOauthRedirect, getUserIntegrations } from '@/services/oauthIntegrationsService';
import Loader from '@/components/Loader/Loader';
import { ActiveTabs } from '../ReusableComponents/ActiveTabs';
import { integrationProviders } from '@/types/integrations';
import { capitalize } from '@/utils/app/data';

interface Props {
  open: boolean;
  onClose: () => void;
}

export const IntegrationsDialog: FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation('settings');
  const { dispatch: homeDispatch, state: { statsService} } = useContext(HomeContext);
  const [connectingStates, setConnectingStates] = useState<{[key: string]: boolean}>({});

  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);

  const integrationsList = [
    {name: "Calendar",
      id: "google_calendar",
      icon: IconBrandGoogleDrive,
      description: "This integration allows assistants to manage your Google Calendar, create events, and schedule meetings."
    },
    {
      name: "Sheets",
      id: "google_sheets",
      icon: IconFileSpreadsheet,
      description: "This integration allows assistants to manage your Google Sheets, add rows, modify data, and create new spreadsheets."
    },
    {
      name: "Docs",
      id: "google_docs",
      icon: IconFileText,
      description: "With this integration, assistants can create, edit, and format Google Docs, making document collaboration easier."
    },
    {
      name: "Drive",
      id: "google_drive",
      icon: IconBrandGoogleDrive,
      description: "This integration enables assistants to organize, upload, and manage files in your Google Drive, enhancing file management capabilities."
    },
    {
      name: "Forms",
      id: "google_forms",
      icon: IconForms,
      description: "Assistants can create and manage surveys, quizzes, and feedback forms using this Google Forms integration."
    },
    {
      name: "Gmail",
      id: "google_gmail",
      icon: IconBrandGmail,
      description: "This integration allows assistants to help manage your emails, draft responses, and organize your inbox in Gmail."
    },
    // { // do we need this?
    //   name: "Office 365",
    //   id: "office_365",
    //   icon: IconBrandOffice,
    //   description: "This integration enables assistants to work with Microsoft Office 365 apps, including Word, Excel, PowerPoint, and Outlook, for document creation, data analysis, and email management."
    // },

    
    // {
    //   name: "Calendar",
    //   id: "microsoft_calendar",
    //   icon: IconBrandOffice,
    //   description: "This integration enables assistants to manage your Microsoft Calendar, schedule meetings, and handle appointments through the Microsoft Graph API."
    // },
    // {
    //   name: "OneDrive",
    //   id: "microsoft_drive",
    //   icon: IconBrandGoogleDrive, // Using drive icon as placeholder
    //   description: "This integration allows assistants to manage files and folders in your OneDrive, enabling document storage and sharing through Microsoft Graph API."
    // },
    // {
    //   name: "Excel",
    //   id: "microsoft_excel",
    //   icon: IconFileSpreadsheet,
    //   description: "This integration enables assistants to create, edit, and analyze Excel spreadsheets using Microsoft Graph API's Excel functionality."
    // },
    // {
    //   name: "OneNote",
    //   id: "microsoft_onenote",
    //   icon: IconFileText,
    //   description: "This integration allows assistants to create and manage OneNote notebooks, pages, and sections through Microsoft Graph API."
    // },

    // {
    //   name: "Outlook",
    //   id: "microsoft_outlook",
    //   icon: IconMailOpened, 
    //   description: "This integration enables assistants to manage your Outlook emails, contacts, and calendar through Microsoft Graph API."
    // },
    // {
    //   name: "Planner",
    //   id: "microsoft_planner",
    //   icon: IconNotebook,
    //   description: "This integration allows assistants to create and manage tasks, plans, and buckets in Microsoft Planner through Microsoft Graph API."
    // },
    // {
    //   name: "SharePoint",
    //   id: "microsoft_sharepoint",
    //   icon: IconBrandOffice,
    //   description: "This integration enables assistants to interact with SharePoint sites, lists, and documents through Microsoft Graph API."
    // },
    // {
    //   name: "Teams",
    //   id: "microsoft_teams",
    //   icon: IconBrandTeams,
    //   description: "This integration allows assistants to manage Teams channels, chats, and meetings through Microsoft Graph API."
    // },
    // {
    //   name: "Contacts",
    //   id: "microsoft_contacts",
    //   icon: IconUsers,
    //   description: "This integration enables assistants to manage your Microsoft contacts, including creating, updating, and organizing contact information through Microsoft Graph API."
    // }
  ];

  const refreshUserIntegrations = async () => {
    try {
      setLoadingIntegrations(true);
      const integrations = await getUserIntegrations(integrationsList.map((i) => i.id));
      if(integrations && integrations.success && integrations.data) {
        setConnectedIntegrations(integrations.data);
      }
      setLoadingIntegrations(false);
    } catch (e) {
      setLoadingIntegrations(false);
      console.error("Error refreshing user integrations: ", e);
    }
  }

  useEffect(() => {
    if (open) {
      refreshUserIntegrations();
    }
  }, [open]);


  const handleDisconnect = async (id: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [id]: true }));
      await deleteUserIntegration(id);
      await refreshUserIntegrations();
    } catch (e) {
      alert("An error occurred. Please try again.");
    } finally {
      setLoadingStates(prev => ({ ...prev, [id]: false }));
    }
  }

  const handleConnect = async (id: string) => {
    setConnectingStates(prev => ({ ...prev, [id]: true }));

    let location = null;
    try {
      const res = await getOauthRedirect(id);
      location = res.body.Location;
    } catch (e) {
      alert("An error occurred. Please try again.");
      setConnectingStates(prev => ({ ...prev, [id]: false }));
      return;
    }

    try {
      const isHttpsUrl = (url: string): boolean => /^https:\/\//.test(url);
      if (isHttpsUrl(location)) {
        const width = 600;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const authWindow = window.open(
          location,
          'Auth Window',
          `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
        );

        if (authWindow) {
          const checkWindow = setInterval(() => {
            if (authWindow.closed) {
              clearInterval(checkWindow);
              refreshUserIntegrations();
              setConnectingStates(prev => ({ ...prev, [id]: false }));
            }
          }, 500);

          authWindow.focus();
        } else {
          setConnectingStates(prev => ({ ...prev, [id]: false }));
        }
      } else {
        alert("An error occurred. Please try again.");
        setConnectingStates(prev => ({ ...prev, [id]: false }));
      }
    } catch (e) {
      alert("An error occurred. Please try again.");
      setConnectingStates(prev => ({ ...prev, [id]: false }));
    }
  };


  if (!open) {
    return null;
  }


  const renderContent = (integrationIdPrefix: string) => {
      return (
        <div className="flex flex-col space-y-4 overflow-x-hidden pr-8 ">

            {loadingIntegrations &&
              <div className="flex flex-col items-center">
                <Loader />
                <div className="text-lg font-bold mb-2 text-black dark:text-neutral-200">Loading integrations...</div>
              </div>
              }

            {!loadingIntegrations && integrationsList
              .filter((i) => i.id.startsWith(integrationIdPrefix))
              .map((integration) => (
              <div key={integration.id} className="flex items-start p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                <div className="flex-grow mr-4">
                  <div className="flex items-center mb-2">
                    {connectedIntegrations.includes(integration.id) && (
                      <IconCheck className="w-5 h-5 mr-2 text-green-500" />
                    )}
                    {integration.icon && <integration.icon className="w-6 h-6 mr-2" />}
                    <span className="text-black dark:text-white font-semibold">{`${capitalize(integrationIdPrefix)} ${integration.name}`}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{integration.description}</p>
                </div>
                <button
                  onClick={() => {
                    if (connectedIntegrations.includes(integration.id)) {
                      handleDisconnect(integration.id);
                    } else {
                      handleConnect(integration.id);
                    }
                  }}
                  disabled={loadingStates[integration.id] || connectingStates[integration.id]}
                  className={`px-4 py-2 rounded-md whitespace-nowrap ${
                    connectedIntegrations.includes(integration.id)
                      ? 'bg-red-500 text-white'
                      : 'bg-blue-500 text-white'
                  } ${(loadingStates[integration.id] || connectingStates[integration.id]) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loadingStates[integration.id] || connectingStates[integration.id] ? (
                    <IconLoader2 className="animate-spin w-5 h-5 inline-block" />
                  ) : (connectedIntegrations.includes(integration.id) ? 'Disconnect' : 'Connect'
                  )}
                </button>
              </div>
            ))}
          </div>
      )
  }

  return (
    <Modal
      width={() => window.innerWidth * 0.62}
      height={() => window.innerHeight * 0.88}
      title={'Integrations'}
      showCancel={false}
      onCancel={onClose}
      onSubmit={onClose}
      submitLabel={"OK"}
      content={
           <ActiveTabs
            width={() => window.innerWidth * 0.6}
            tabs={[
              ///////////////////////////////////////////////////////////////////////////////
                        {label: `Google`, 
                         content: <>{renderContent(integrationProviders.Google)}</>
                        },
              
              ///////////////////////////////////////////////////////////////////////////////
                      // {label: `Microsoft Office 365`, 
                      //  content: <>{renderContent(integrationProviders.Microsoft)}</> 
                      // }
                      
            ]}
        />
      }
    />
  );
};