<script lang="ts" setup>
// Emits
import {generateRandomString, stripTags} from "lkt-string-tools";
import {computed, nextTick, onMounted, ref, useSlots, watch} from "vue";
import {createLktEvent} from "lkt-events";
import {Settings} from "../settings/Settings";
import suneditor from 'suneditor';
import plugins from 'suneditor/src/plugins';

// How to import language files (default: en)
import * as lang from 'suneditor/src/lang';

const emits = defineEmits(['update:modelValue', 'keyup', 'keydown', 'focus', 'blur', 'click', 'click-info', 'click-error']);

// Slots
const slots = useSlots();

// Props
const props = withDefaults(defineProps<{
    modelValue: string | number
    placeholder?: string
    label?: string
    palette?: string
    name?: string
    valid?: boolean
    autocomplete?: boolean
    disabled?: boolean
    readonly?: boolean
    readMode?: boolean
    allowReadModeSwitch?: boolean
    tabindex?: number
    mandatory?: boolean
    reset?: boolean
    resetMessage?: string
    mandatoryMessage?: string
    infoMessage?: string
    errorMessage?: string
    switchEditionMessage?: string
    emptyValueSlot?: string
    valueSlot?: string
    editSlot?: string
    slotData?: LktObject
    editorOptions?: LktObject
    lang: string
}>(), {
    modelValue: '',
    placeholder: '',
    label: '',
    palette: '',
    name: generateRandomString(16),
    valid: false,
    autocomplete: true,
    disabled: false,
    readonly: false,
    readMode: false,
    allowReadModeSwitch: false,
    tabindex: undefined,
    mandatory: false,
    reset: false,
    resetMessage: '',
    mandatoryMessage: '',
    infoMessage: '',
    errorMessage: '',
    showPasswordMessage: '',
    switchEditionMessage: '',
    emptyValueSlot: '',
    valueSlot: '',
    editSlot: '',
    slotData: () => ({}),
    editorOptions: () => ({
        buttonList: [
            ['undo', 'redo'],
            ['font', 'fontSize', 'formatBlock'],
            ['paragraphStyle', 'blockquote'],
            ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
            ['fontColor', 'hiliteColor', 'textStyle'],
            ['removeFormat'],
            '/', // Line break
            ['outdent', 'indent'],
            ['align', 'horizontalRule', 'list', 'lineHeight'],
            ['table', 'link', /**'image', 'video', 'audio',*/],
            /** ['imageGallery'] */ // You must add the "imageGalleryUrl".
            ['fullScreen', 'showBlocks', 'codeView'],
            ['preview', 'print'],
            [/**'save',*/ 'template']
        ]
    }),
    lang: 'en'
});

// Constant data
const Identifier = generateRandomString(16);


// Components refs
const inputElement = ref(null);

// Reactive data
const originalValue = ref(props.modelValue),
    value = ref(props.modelValue),
    focusing = ref(false),
    editable = ref(!props.readMode),
    editor = ref(null),
    timeout = ref(undefined);


const isValid = computed(() => {
        // @ts-ignore
        if (typeof props.valid === 'function') return props.valid();
        return props.valid;
    }),
    changed = computed(() => value.value !== originalValue.value),
    showInfoUi = computed(() => {
        return props.reset || props.infoMessage !== '' || props.errorMessage !== '';
    }),
    amountOfIcons = computed(() => {
        let r = 0;
        if (props.reset) ++r;
        if (props.infoMessage) ++r;
        return r;
    }),
    resetText = computed(() => {
        if (props.resetMessage !== '') return props.resetMessage;
        return '';
    }),
    autocompleteText = computed(() => {
        return props.autocomplete === true ? 'on' : 'off';
    }),
    isFilled = computed(() => {
        return value.value !== '';
    }),
    classes = computed(() => {
        const r = ['lkt-field', 'lkt-field-editor'];

        if (props.palette) r.push(`lkt-field--${props.palette}`);
        if (changed.value) r.push('is-changed');
        if (props.disabled) r.push('is-disabled');
        if (focusing.value) r.push('has-focus');

        if (amountOfIcons.value > 0) r.push(`has-icons`, `has-icons-${amountOfIcons.value}`);

        r.push(isValid.value ? 'is-valid' : 'is-error');
        r.push(!!props.modelValue ? 'is-filled' : 'is-empty');

        return r.join(' ');
    }),
    readModeTitle = computed(() => {
        if (typeof value.value === 'number') return value.value.toString();
        return value.value;
    });

const focus = () => {
    nextTick(() => {
        if (inputElement.value) {
            inputElement.value.focus();
        }
    });
};


// Watch data
watch(() => props.readMode, (v) => editable.value = !v)
watch(() => props.modelValue, (v) => {
    value.value = v
})
watch(value, (v) => emits('update:modelValue', v))

const reset = () => value.value = originalValue.value,
    getValue = () => value.value,
    onKeyUp = ($event: any) => emits('keyup', $event, createLktEvent(Identifier, {value: value.value})),
    onKeyDown = ($event: any) => emits('keydown', $event, createLktEvent(Identifier, {value: value.value})),
    onFocus = ($event: any) => (focusing.value = true) && emits('focus', $event, createLktEvent(Identifier, {value: value.value})),
    onBlur = ($event: any) => (focusing.value = false) && emits('blur', $event, createLktEvent(Identifier, {value: value.value})),
    onClick = ($event: any) => emits('click', $event, createLktEvent(Identifier, {value: value.value})),
    onClickInfo = ($event: any) => emits('click-info', $event, createLktEvent(Identifier, {value: value.value})),
    onClickError = ($event: any) => emits('click-error', $event, createLktEvent(Identifier, {value: value.value})),
    onClickSwitchEdition = ($event: any) => {
        editable.value = !editable.value;
        if (editable.value) focus();
    };

defineExpose({
    Identifier,
    reset,
    focus,
    value: getValue,
    isMandatory: () => props.mandatory
});

reset();

const hasCustomValueSlot = computed(() => {
        if (value.value === '') {
            return (props.emptyValueSlot !== '' && typeof Settings.customValueSlots[props.emptyValueSlot] !== 'undefined') || (Settings.defaultEmptyValueSlot && typeof Settings.customValueSlots[Settings.defaultEmptyValueSlot] !== 'undefined');
        }
        return props.valueSlot !== '' && typeof Settings.customValueSlots[props.valueSlot] !== 'undefined';
    }),
    customValueSlot = computed(() => {
        if (value.value === '') {
            return Settings.customValueSlots[props.emptyValueSlot] ?? Settings.customValueSlots[Settings.defaultEmptyValueSlot];
        }

        return Settings.customValueSlots[props.valueSlot];
    }),
    hasCustomEditSlot = computed(() => props.editSlot !== '' && typeof Settings.customEditSlots[props.editSlot] !== 'undefined'),
    customEditSlot = computed(() => Settings.customEditSlots[props.editSlot]);

onMounted(() => {
    let options = {...props.editorOptions, ...{
        plugins,
        lang: lang[props.lang] ? lang[props.lang] : lang.en
    }};
    editor.value = suneditor.create(Identifier, options);

    editor.value.onChange = (content) => {
        if (timeout.value) clearTimeout(timeout.value);

        timeout.value = setTimeout(() => {
            let strippedContent = stripTags(content);
            if (strippedContent === '') value.value = '';
            else value.value = content
        }, 100);

        if (props.disabled) editor.value.disabled();
        else editor.value.enabled();
    }

    editor.value.onBlur = () => {
        if (timeout.value) clearTimeout(timeout.value);
    }

    editor.value.onKeyUp = () => {
        if (timeout.value) clearTimeout(timeout.value);
    }
})
</script>

<template>
    <div v-bind:class="classes"
         v-bind:data-show-ui="showInfoUi"
         v-bind:data-labeled="!!!slots.label"
    >
        <slot v-if="!!slots.label" name="label"></slot>
        <label v-if="!!!slots.label" :for="Identifier" v-html="label"></label>

        <div v-show="editable" class="lkt-field-editor__main">
            <template v-if="slots['edit']">
                <div v-on:click="onClick">
                    <slot name="edit" v-bind:value="value" :title="readModeTitle" :data="slotData"></slot>
                </div>
            </template>
            <div v-else-if="hasCustomEditSlot" v-on:click="onClick">
                <component v-bind:is="customEditSlot"
                           v-bind:value="value" :title="readModeTitle" :data="slotData"></component>
            </div>
            <template v-else-if="placeholder">
                <textarea v-model="value"
                          :ref="(el:any) => inputElement = el"
                          v-bind:value="value"
                          v-bind:name="name"
                          v-bind:id="Identifier"
                          v-bind:disabled="disabled"
                          v-bind:readonly="readonly"
                          v-bind:placeholder="placeholder"
                          v-bind:tabindex="tabindex"
                          v-bind:autocomplete="autocompleteText"
                          v-on:keyup="onKeyUp"
                          v-on:keydown="onKeyDown"
                          v-on:focus="onFocus"
                          v-on:blur="onBlur"
                          v-on:click="onClick"
                ></textarea>
            </template>
            <template v-else>
                <textarea v-model="value"
                          :ref="(el:any) => inputElement = el"
                          v-bind:value="value"
                          v-bind:name="name"
                          v-bind:id="Identifier"
                          v-bind:disabled="disabled"
                          v-bind:readonly="readonly"
                          v-bind:tabindex="tabindex"
                          v-bind:autocomplete="autocompleteText"
                          v-on:keyup="onKeyUp"
                          v-on:keydown="onKeyDown"
                          v-on:focus="onFocus"
                          v-on:blur="onBlur"
                          v-on:click="onClick">
                    </textarea>
            </template>

            <div class="lkt-field__state" v-if="showInfoUi">
                <i v-if="props.errorMessage" class="lkt-field__error-icon" :title="props.errorMessage"
                   v-on:click="onClickError"></i>
                <i v-if="props.infoMessage" class="lkt-field__info-icon" :title="props.infoMessage"
                   v-on:click="onClickInfo"></i>
                <i v-if="props.reset && isFilled" class="lkt-field__reset-icon" :title="resetText"
                   v-on:click="reset"></i>
                <i v-if="props.mandatory" class="lkt-field__mandatory-icon" :title="props.mandatoryMessage"></i>
                <i v-if="allowReadModeSwitch" class="lkt-field__edit-icon" :title="props.switchEditionMessage"
                   v-on:click="onClickSwitchEdition"></i>
            </div>
        </div>

        <div v-if="!editable" class="lkt-field-editor__read">
            <template v-if="slots['value']">
                <slot name="value" v-bind:value="value" :title="readModeTitle" :data="slotData"></slot>
            </template>
            <component v-else-if="hasCustomValueSlot" v-bind:is="customValueSlot"
                       v-bind:value="value" :title="readModeTitle"></component>
            <div v-else class="lkt-field-editor__read-value" v-html="value" :title="readModeTitle"></div>
            <div v-if="allowReadModeSwitch" class="lkt-field__state">
                <i class="lkt-field__edit-icon" :title="props.switchEditionMessage"
                   v-on:click="onClickSwitchEdition"></i>
            </div>
        </div>
    </div>
</template>