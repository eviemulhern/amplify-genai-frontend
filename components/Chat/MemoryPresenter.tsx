import {
    FC,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

import { useTranslation } from 'next-i18next';
import HomeContext from '@/pages/api/home/home.context';
import { DEFAULT_ASSISTANT } from "@/types/assistant";
import { useChatService } from "@/hooks/useChatService";
import { getSettings } from '@/utils/app/settings';
import { useSession } from 'next-auth/react';
import { doSaveMemoryOp, doCreateProjectOp, doGetProjectsOp } from '@/services/memoryService';
import { Settings } from '@/types/settings';
import { Toggle } from '@/components/ReusableComponents/Toggle';

interface Props {
    isFactsVisible: boolean;
    setIsFactsVisible: (isVisible: boolean) => void;
}

export const MemoryPresenter: FC<Props> = ({
    isFactsVisible, setIsFactsVisible}) => {

    const {
        state: { selectedConversation, selectedAssistant, featureFlags, extractedFacts, memoryExtractionEnabled },
        dispatch: homeDispatch
    } = useContext(HomeContext);

    let settingRef = useRef<Settings | null>(null);
        // prevent recalling the getSettings function
    if (settingRef.current === null) settingRef.current = getSettings(featureFlags);
    
    useEffect(() => {
        const handleEvent = (event:any) => settingRef.current = getSettings(featureFlags)
        window.addEventListener('updateFeatureSettings', handleEvent);
        return () => window.removeEventListener('updateFeatureSettings', handleEvent)
    }, []);

    const [factTypes, setFactTypes] = useState<{ [key: string]: string }>({});
    const [selectedProjects, setSelectedProjects] = useState<{ [key: string]: string }>({});
    const [loadingStates, setLoadingStates] = useState<{ [key: number]: string }>({});

    const { data: session } = useSession();
    const userEmail = session?.user?.email;

    const handleTypeChange = (index: number, value: string) => {
        setFactTypes(prev => ({ ...prev, [index]: value }));
    };

    const handleToggleMemoryExtraction = (enabled: boolean) => {
        homeDispatch({
            field: 'memoryExtractionEnabled',
            value: enabled
        });
    };

    const handleSaveFact = async (index: number) => {
        setLoadingStates(prev => ({ ...prev, [index]: 'saving' }));

        const fact = extractedFacts[index];
        const type = factTypes[index] || 'user';

        let typeID: string;
        switch (type) {
            case 'user':
                if (!userEmail) {
                    throw new Error('User email not available');
                }
                typeID = userEmail;
                break;
            case 'assistant':
                typeID = selectedAssistant?.definition?.assistantId || 'default-assistant-id';
                break;
            case 'project':
                const projectId = selectedProjects[index];
                if (!projectId) {
                    throw new Error('No project selected');
                }
                typeID = projectId;
                break;
            default:
                typeID = type;
        }

        try {
            await doSaveMemoryOp(fact, type, typeID);

            // Remove the saved fact from the list
            const updatedFacts = extractedFacts.filter((_, i) => i !== index);
            homeDispatch({ field: 'extractedFacts', value: updatedFacts });

            // Clean up the fact type and selected project
            const updatedFactTypes = { ...factTypes };
            delete updatedFactTypes[index];
            setFactTypes(updatedFactTypes);

            const updatedSelectedProjects = { ...selectedProjects };
            delete updatedSelectedProjects[index];
            setSelectedProjects(updatedSelectedProjects);

            // Clear loading state on success
            setLoadingStates(prev => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
        } catch (error) {
            // Clear loading state on error
            setLoadingStates(prev => {
                const newState = { ...prev };
                delete newState[index];
                return newState;
            });
            console.error('Failed to save memory:', error);
            alert('Failed to save memory item');
        }
    };

    const handleDeleteFact = (index: number) => {
        setLoadingStates(prev => ({ ...prev, [index]: 'deleting' }));
        
        // Remove the fact without saving
        const updatedFacts = extractedFacts.filter((_, i) => i !== index);
        homeDispatch({ field: 'extractedFacts', value: updatedFacts });

        // Clean up the fact type
        const updatedFactTypes = { ...factTypes };
        delete updatedFactTypes[index];
        setFactTypes(updatedFactTypes);

        // Clear loading state
        setLoadingStates(prev => {
            const newState = { ...prev };
            delete newState[index];
            return newState;
        });
    };

    const getUserProjects = async () => {
        try {
            if (userEmail) {
                const response = await doGetProjectsOp(userEmail);
                // console.log("RESPONSE!!!", response);
                if (response && response.body) {
                    // Parse the JSON string in the body
                    const parsedBody = JSON.parse(response.body);
                    return parsedBody;  // This will now have the projects array
                }
            }
            return { projects: [] };
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            return { projects: [] };
        }
    };

    const ProjectSelector = ({
        index,
        selectedProject,
        onProjectSelect
    }: {
        index: number;
        selectedProject: string;
        onProjectSelect: (projectId: string) => void;
    }) => {
        const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
        const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
        const [newProjectName, setNewProjectName] = useState('');

        useEffect(() => {
            loadProjects();
        }, []);

        interface ProjectFromBackend {
            id: string;
            project: string;
            user: string;
            timestamp: string;
        }

        const loadProjects = async () => {
            const response = await getUserProjects();
            if (!response) {
                setProjects([]);
                return;
            }
            const formattedProjects = (response.projects as ProjectFromBackend[])?.map(project => ({
                id: project.id,
                name: project.project
            })) || [];
            setProjects(formattedProjects);
        };

        const handleCreateProject = async () => {
            try {
                await doCreateProjectOp(newProjectName);
                setNewProjectName('');
                setIsCreateModalOpen(false);
                // Reload projects after creating new one
                await loadProjects();
            } catch (error) {
                console.error('Failed to create project:', error);
                alert('Failed to create project');
            }
        };

        return (
            <>
                <select
                    value={selectedProject || ''}
                    onChange={(e) => {
                        if (e.target.value === 'create-new') {
                            setIsCreateModalOpen(true);
                        } else {
                            onProjectSelect(e.target.value);
                        }
                    }}
                    style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '4px 24px 4px 8px',
                        color: 'inherit',
                        fontSize: 'inherit',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'><path fill='%23666' d='M0 2l4 4 4-4z'/></svg>")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 8px center'
                    }}
                    className="dark:bg-[#343541] dark:text-white dark:border-gray-600"
                >
                    <option value="">Select a project...</option>
                    {projects.map(project => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                    <option value="create-new">Create New Project...</option>
                </select>

                {isCreateModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-[#343541] p-6 rounded-lg shadow-xl">
                            <h3 className="mb-4">Create New Project</h3>
                            <input
                                type="text"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="Project name"
                                className="border p-2 mb-4 w-full dark:bg-[#40414F] dark:border-gray-600 dark:text-white rounded"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateProject}
                                    className="px-4 py-2 bg-blue-500 text-white rounded"
                                    disabled={!newProjectName.trim()}
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            <div className="flex flex-col justify-center items-center stretch mx-2 flex flex-row gap-3 last:mb-2 md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-3xl">
                {featureFlags.memory && settingRef.current?.featureOptions.includeMemory && selectedConversation && selectedConversation.messages?.length > 0 && extractedFacts.length > 0 && (
                    <div>
                        { isFactsVisible && 
                            <div className="extracted-facts">
                                <div className="w-full flex justify-between items-center mb-4 px-4">
                                    <Toggle
                                        label="Auto-extract new memories"
                                        enabled={memoryExtractionEnabled}
                                        onChange={handleToggleMemoryExtraction}
                                        size="small"
                                    />
                                    <button
                                        onClick={() => setIsFactsVisible(false)}
                                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                    >
                                        Hide facts
                                    </button>
                                </div>
                                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Fact</th>
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Fact Type</th>
                                            {extractedFacts.some((_, index) => factTypes[index] === 'project') && (
                                                <th style={{ border: '1px solid #ddd', padding: '8px' }}>Project</th>
                                            )}
                                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Save to memory?</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...extractedFacts].map((fact, index) => (
                                            <tr key={index}>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{fact}</td>
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                    <select
                                                        value={factTypes[index] || ''}
                                                        onChange={(e) => handleTypeChange(index, e.target.value)}
                                                        style={{
                                                            backgroundColor: 'transparent',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '4px',
                                                            padding: '4px 24px 4px 8px', // extra padding on right for arrow
                                                            color: 'inherit',
                                                            fontSize: 'inherit',
                                                            fontFamily: 'inherit',
                                                            cursor: 'pointer',
                                                            WebkitAppearance: 'none',
                                                            MozAppearance: 'none',
                                                            appearance: 'none',
                                                            backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'><path fill='%23666' d='M0 2l4 4 4-4z'/></svg>")`,
                                                            backgroundRepeat: 'no-repeat',
                                                            backgroundPosition: 'right 8px center'
                                                        }}
                                                        className="dark:bg-[#343541] dark:text-white dark:border-gray-600"

                                                    >
                                                        {selectedAssistant && selectedAssistant !== DEFAULT_ASSISTANT && (
                                                            <option value="assistant">Assistant</option>
                                                        )}
                                                        <option value="user">User</option>
                                                        <option value="project">Project</option>
                                                    </select>
                                                </td>
                                                {extractedFacts.some((_, i) => factTypes[i] === 'project') && (
                                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                        {factTypes[index] === 'project' ? (
                                                            <ProjectSelector
                                                                index={index}
                                                                selectedProject={selectedProjects[index]}
                                                                onProjectSelect={(projectId) => {
                                                                    setSelectedProjects(prev => ({
                                                                        ...prev,
                                                                        [index]: projectId
                                                                    }));
                                                                }}
                                                            />
                                                        ) : null}
                                                    </td>
                                                )}
                                                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                                    <div className="flex justify-center gap-4">
                                                        {loadingStates[index] === 'saving' ? (
                                                            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleSaveFact(index)}
                                                                disabled={factTypes[index] === 'project' && !selectedProjects[index]}
                                                                className="hover:opacity-75 transition-opacity"
                                                            >✅</button>
                                                        )}
                                                        {loadingStates[index] === 'deleting' ? (
                                                            <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleDeleteFact(index)}
                                                                className="hover:opacity-75 transition-opacity"
                                                            >❌</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        }
                    </div>
                )}
            </div>
        </>
    )
};