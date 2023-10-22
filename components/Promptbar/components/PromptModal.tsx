import {FC, KeyboardEvent, useContext, useEffect, useRef, useState} from 'react';

import { useTranslation } from 'next-i18next';
import JSON5 from 'json5'
import { Prompt } from '@/types/prompt';
import {boolean} from "property-information/lib/util/types";
import {MessageType} from "@/types/chat";
import HomeContext from "@/pages/api/home/home.context";
import {findWorkflowPattern} from "@/utils/workflow/aiflow";
import {variableTypeOptions, parsePromptVariableValues, parsePromptVariables, getType, getName} from "@/utils/app/prompts";
import ExpansionComponent from "@/components/Chat/ExpansionComponent";
import EditableField from "@/components/Promptbar/components/EditableField";

interface Props {
  prompt: Prompt;
  onSave: () => void;
  onCancel: () => void;
  onUpdatePrompt: (prompt: Prompt) => void;
}

const getVariableOptions = (promptTemplate:string) => {
  const variables = parsePromptVariables(promptTemplate);

  return variables.map((variable) => {
    const type = getType(variable);
    const values = parsePromptVariableValues(variable);
    // @ts-ignore
    const typeData = variableTypeOptions[type];

    return {
      label: getName(variable),
      variable: variable,
      type: type,
      optionValues: values,
      typeData: typeData
    };
  });
}

export const PromptModal: FC<Props> = ({ prompt, onCancel, onSave, onUpdatePrompt }) => {
  const { t } = useTranslation('promptbar');
  const {
    state: { featureFlags, prompts },
  } = useContext(HomeContext);


  const rootPrompts = prompts.filter((p) => p.type === MessageType.ROOT);
  const workflowRoot =
      rootPrompts.filter(p => p.id === prompt.data?.rootPromptId)[0]
      || rootPrompts[0];

  let initialCode = prompt.data?.code ? "const workflow = " + prompt.data.code :  '//@START_WORKFLOW\n' +
      'const workflow = async (fnlibs) => {\n' +
      '     \n' +
      '    try {\n' +
      '        fnlibs.tellUser("Executing the generated workflow...");\n' +
      '        let value = {type:"table", data:null}; // Initialize value\n' +
      '' +
      '        return value;\n' +
      '    }\n' +
      '    catch(e){\n' +
      '       throw e;\n' +
      '    }\n' +
      '};//@\n' +
      '\n';

  const [rootPrompt, setRootPrompt] = useState<Prompt>(workflowRoot);
  const [name, setName] = useState(prompt.name);
  const [description, setDescription] = useState(prompt.description);
  const [content, setContent] = useState(prompt.content);
  const [code, setCode] = useState(initialCode);
  const [variableOptions, setVariableOptions] = useState(getVariableOptions(content));

  const [selectedTemplate, setSelectedTemplate] = useState<string>(prompt.type || MessageType.PROMPT);

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateRootPrompt = (rootPromptId:string) => {
    let root = prompts.filter((p) => p.id === rootPromptId)[0];
    setRootPrompt(root);
  }

  const handleUpdateTemplate = (promptTemplate:string) =>{
    setVariableOptions(getVariableOptions(promptTemplate));
    setContent(promptTemplate);
  };

  const handleUpdateVariableOptionValues = (variable:string, type:string, optionName:string, optionValue:any) => {

    let newVariableOptions = [...variableOptions];
    newVariableOptions.forEach((variableOption) => {
      if(variableOption.label === variable){
        if(optionValue == null){
            delete variableOption.optionValues[optionName];
        }
        else {
          variableOption.optionValues[optionName] = optionValue;
        }
      }
    });

    const optionValuesToRender = newVariableOptions.filter((variableOption) => {
        return (variableOption.label === variable);
    })[0].optionValues;

    let renderedVariable = "{{"
        + variable + ":" + type
        + ((optionValuesToRender.length == 0)? "" : "(" + JSON5.stringify(optionValuesToRender).slice(1,-1) + ")")
        +"}}";

    const search = new RegExp("{{\\s*"+variable+"\\s*(\\s*:\\s*(.*?)\\s*(\\(.*?\\))?)?\\s*}}", "g");

    let newContent = content.replaceAll(search, renderedVariable);

    setVariableOptions(newVariableOptions);
    setContent(newContent);
  }


  const handleUpdatePrompt = () => {
    const newPrompt = { ...prompt, name, description, content: content.trim(), type: selectedTemplate};
    newPrompt.data = {...prompt.data, rootPromptId: rootPrompt.id};

    if (featureFlags.workflowCreate
        && selectedTemplate === MessageType.AUTOMATION
        && code
        && findWorkflowPattern(code)) {
      console.log("Updated code:", findWorkflowPattern(code));
      newPrompt.data = {...prompt.data, code: findWorkflowPattern(code)};
    }

    onUpdatePrompt(newPrompt);
  }

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        window.addEventListener('mouseup', handleMouseUp);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      window.removeEventListener('mouseup', handleMouseUp);
      onCancel();
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onCancel]);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);


  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
    >
      <div className="fixed inset-0 z-10 overflow-hidden">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
            aria-hidden="true"
          />

          <div
            ref={modalRef}
            className="dark:border-netural-400 inline-block max-h-[400px] transform overflow-y-auto rounded-lg border border-gray-300 bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all dark:bg-[#202123] sm:my-8 sm:max-h-[600px] sm:w-full sm:max-w-lg sm:p-6 sm:align-middle"
            role="dialog"
          >
            <div className="text-sm font-bold text-black dark:text-neutral-200">
              {t('Name')}
            </div>
            <input
              ref={nameInputRef}
              className="mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
              placeholder={t('A name for your prompt.') || ''}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div className="mt-6 text-sm font-bold text-black dark:text-neutral-200">
              {t('Description')}
            </div>
            <textarea
              className="mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
              style={{ resize: 'none' }}
              placeholder={t('A description for your prompt.') || ''}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />

            {selectedTemplate !== MessageType.ROOT && (
                <>
                <div className="mt-6 text-sm font-bold text-black dark:text-neutral-200">
                  {t('Custom Instructions')}
                </div>
              <select
              className="mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
              value={rootPrompt.id}
              onChange={(e) => handleUpdateRootPrompt(e.target.value)}
              >
            {rootPrompts.map((rootPrompt) => (
              <option key={rootPrompt.id} value={rootPrompt.id}>
                 {rootPrompt.name}
              </option>
              ))}
              </select>
                </>)}


            <div className="mt-6 text-sm font-bold text-black dark:text-neutral-200">
              {t('Prompt')}
            </div>
            <textarea
              className="mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
              style={{ resize: 'none' }}
              placeholder={
                t(
                  'Prompt content. Use {{}} to denote a variable. Ex: {{name}} is a {{adjective}} {{noun}}',
                ) || ''
              }
              value={content}
              onChange={(e) => handleUpdateTemplate(e.target.value)}
              rows={10}
            />

            {variableOptions.length > 0 && (
                <div className="mt-6 text-sm font-bold text-black dark:text-neutral-200">
                    {t('Variables')}
                </div>
            )}
            {variableOptions.map((variableOption,index) => (
              <div key={index} className="mt-2 mb-6 text-sm font-bold text-black dark:text-neutral-200">

                  <ExpansionComponent key={variableOption.variable} title={variableOption.label + ":" + variableOption.type}
                      // @ts-ignore
                                      content={
                        <div className="mt-2 mb-6 text-sm font-bold text-black dark:text-neutral-200">
                          {variableOption.typeData && Object.entries(variableOption.typeData).map(([key,data],index) => (
                              <div key={key} className="mt-4">
                                <input
                                    className={"mr-2"}
                                    type="checkbox"
                                    checked={variableOption.optionValues[key] != null}
                                    onChange={(e) => {
                                      if(!e.target.checked) {
                                        variableOption.optionValues[key] = null;
                                      }
                                      else {
                                        variableOption.optionValues[key] = variableOption.typeData[key].default;
                                      }
                                      handleUpdateVariableOptionValues(variableOption.label, variableOption.type, key, e.target.checked? variableOption.typeData[key].default || '' : null)
                                    }}
                                />

                                {// @ts-ignore
                                  data.title}: <EditableField currentValue={variableOption.optionValues[key] || variableOption.typeData[key].default || ''} data={data} handleUpdate={(v)=>handleUpdateVariableOptionValues(variableOption.label, variableOption.type, key, v)}/>
                              </div>
                              ))}
                        </div>
                  }></ExpansionComponent>
              </div>
            ))}

            {featureFlags.workflowCreate && selectedTemplate === MessageType.AUTOMATION && (
                <>
                <div className="mt-6 text-sm font-bold text-black dark:text-neutral-200">
                  {t('Code')}
                </div>
                <textarea
                    className="mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
                    style={{ resize: 'none' }}
                    placeholder={
                        t(
                            '//@START_WORKFLOW\n' +
                            'const workflow = async (fnlibs) => {\n' +
                            '     \n' +
                            '    try {\n' +
                            '        fnlibs.tellUser("Executing the generated workflow...");\n' +
                            '        let value = {type:"table", data:null}; // Initialize value\n' +
                            '' +
                            '        return value;\n' +
                            '    }\n' +
                            '    catch(e){\n' +
                            '       throw e;\n' +
                            '    }\n' +
                            '};//@\n' +
                            '\n',
                        ) || ''
                    }
                    value={code||""}
                    onChange={(e) => setCode(e.target.value)}
                    rows={10}
                />
                </>
            )}



              <div className="mt-2">
              <div className="inline-flex items-center cursor-pointer text-neutral-900 dark:text-neutral-100 mr-8">
                <input
                    type="radio"
                    name="template"
                    className="form-radio rounded-lg border border-neutral-500 shadow focus:outline-none dark:border-neutral-800 dark:bg-[#40414F] dark:ring-offset-neutral-300 dark:border-opacity-50"
                    value={MessageType.PROMPT}
                    checked={selectedTemplate === MessageType.PROMPT}
                    onChange={() => setSelectedTemplate(MessageType.PROMPT)}
                />
                <label className="ml-2">
                  Prompt template
                </label>
              </div>

                {featureFlags.rootPromptCreate && (
                    <div className="inline-flex items-center cursor-pointer text-neutral-900 dark:text-neutral-100">
                      <input
                          type="radio"
                          name="template"
                          className="form-radio rounded-lg border border-neutral-500 shadow focus:outline-none dark:border-neutral-800 dark:bg-[#40414F] dark:ring-offset-neutral-300 dark:border-opacity-50"
                          value={MessageType.ROOT}
                          checked={selectedTemplate === MessageType.ROOT}
                          onChange={() => setSelectedTemplate(MessageType.ROOT)}
                      />
                      <label className="ml-2">
                        Custom instructions
                      </label>
                    </div>
                )}

              {featureFlags.workflowCreate && (
              <div className="inline-flex items-center cursor-pointer text-neutral-900 dark:text-neutral-100">
                <input
                    type="radio"
                    name="template"
                    className="form-radio rounded-lg border border-neutral-500 shadow focus:outline-none dark:border-neutral-800 dark:bg-[#40414F] dark:ring-offset-neutral-300 dark:border-opacity-50"
                    value={MessageType.AUTOMATION}
                    checked={selectedTemplate === MessageType.AUTOMATION}
                    onChange={() => setSelectedTemplate(MessageType.AUTOMATION)}
                />
                <label className="ml-2">
                  Automation template
                </label>
              </div>
              )}

            </div>


            <button
              type="button"
              className="w-full px-4 py-2 mt-6 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300"
              onClick={() => {
                handleUpdatePrompt();
                onSave();
              }}
            >
              {t('Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
