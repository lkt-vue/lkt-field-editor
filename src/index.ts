import { App } from 'vue';

import LktFieldValidation from 'lkt-field-validation';

import { default as editor } from './lib-components/LktFieldEditor.vue';

import {Settings} from "./settings/Settings";

const LktFieldTextArea = {
  install: (app: App) => {
    // Register plugin components
    if (app.component('lkt-field-editor') === undefined) app.component('lkt-field-editor', editor);
    if (app.component('lkt-field-validations') === undefined) app.use(LktFieldValidation);
  },
};

export default LktFieldTextArea;


export const setDefaultEditorEmptyValueSlot = (str: string, component?: string|Component) => {
  Settings.defaultEmptyValueSlot = str;

  if (component) Settings.customValueSlots[str] = component;
}

export const setEditorValueSlot = (resource: string, component: string|Component) => {
  Settings.customValueSlots[resource] = component;
  return true;
}

export const setEditorEditSlot = (resource: string, component: string|Component) => {
  Settings.customEditSlots[resource] = component;
  return true;
}