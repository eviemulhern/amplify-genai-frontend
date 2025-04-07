import { FC } from 'react';
import { IconX } from '@tabler/icons-react';
import ActionButton from '../ReusableComponents/ActionButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-4xl rounded-lg bg-white dark:bg-[#202123] shadow-xl" style={{ maxHeight: '90vh' }}>
        {/* Header with close button - outside of scrollable area */}
        <div className="sticky top-0 z-10 flex justify-end p-2 rounded-t-lg bg-white dark:bg-[#202123]">
          <ActionButton
            handleClick={onClose}
            title="Close"
          >
            <IconX size={20} />
          </ActionButton>
        </div>
        
        {/* Scrollable content area with padding */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 48px)' }}>
          <h1 className="text-2xl font-bold mb-6 text-black dark:text-white">How can we use AI safely on Davidson's Amplify?</h1>
          
          <div className="text-black dark:text-white">
            <ol className="list-decimal space-y-6 ml-6">
              <li className="font-semibold">
                Protect our privacy
                <ol className="list-[lower-alpha] ml-8 mt-2 font-normal">
                  <li className="mb-2">Do not submit personal information such as your social security number, your bank information, and more</li>
                  <li>While this data is not being stored in the Cloud or used to train AI models, therefore we can submit some Davidson-specific data, be wary of giving very personal/secret information</li>
                </ol>
              </li>

              <li className="font-semibold">
                Do not rely solely on AI
                <ol className="list-[lower-alpha] ml-8 mt-2 font-normal">
                  <li>AI can easily have information that is quite convincing but incorrect. So, be sure to fact-check with reputable sources (academic papers, government websites, reputable news outlets) and scholarly sources (Google Scholar or Davidson's library databases)</li>
                </ol>
              </li>

              <li className="font-semibold">
                Use AI ethically and do not plagiarize
                <ol className="list-[lower-alpha] ml-8 mt-2 font-normal">
                  <li className="mb-2">AI often uses the same words/phrases, or even copies complete blurbs from other sources to make their content. This means plagiarism is very possible, so stay vigilant and check your content</li>
                  <li className="mb-2">If you do use AI content in your work, be sure to cite your sources</li>
                  <li className="mb-2">Do not use AI to complete your assignments, write your essays, or make fake citations</li>
                  <li>Be sure to check with your professor's policies on AI before you use it!</li>
                </ol>
              </li>

              <li className="font-semibold">
                Be aware of biases in AI models
                <ol className="list-[lower-alpha] ml-8 mt-2 font-normal">
                  <li className="mb-2">Because AI models are trained on man-made data, there can be biases and misinformation. As well, cultural, political, and ideological biases can be prevalent</li>
                  <li>Stay cautious when you use AI for sensitive topics like history, politics, or social issues</li>
                </ol>
              </li>

              <li className="font-semibold">
                Choose reputable AI tools
                <ol className="list-[lower-alpha] ml-8 mt-2 font-normal">
                  <li className="mb-2">Stick with what is reliable and well-known... ChatGPT, Google Gemini, etc</li>
                  <li>Avoid apps that request access to personal data and social media platforms</li>
                </ol>
              </li>

              <li className="font-semibold">
                Balance AI with Real-World Learning
                <ol className="list-[lower-alpha] ml-8 mt-2 font-normal">
                  <li className="mb-2">While AI can be really awesome to expedite your work, it is important to continue to challenge yourself in learning</li>
                  <li className="mb-2">Be sure to not use AI as a crutch, but as a tool to aid your work</li>
                  <li>It is crucial to not loose your critical thinking and reasoning skills by leaving them out of practice</li>
                </ol>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}; 