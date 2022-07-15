import { LitElement, html, css, svg } from 'lit-element';
import { registerTranslateConfig, use, translate, get } from "lit-translate";
import {
    fetchOrgsOfInstance, fetchOrgsTargetedBy, fetchMailTo,
    TEMPLATE_MAILTO_ACCESS, ITEM_ONLINE_DATING_APPLICATION
} from './personaldata-io.js';

const TRANSLATION_FIELDS = {
    "subject": "sar-form-subject",
    "app_type_name": "sar-form-app_type_name",
    "select_placeholder": "sar-form-select_placeholder",
    "email_button": "sar-form-email_button",
    "body_placeholder": "sar-form-body_placeholder",
    "recipient": "sar-form-recipient",
    "carbon_copy": "sar-form-carbon_copy",
    "search_placeholder": "sar-form-search_placeholder",
    "copy_button": "sar-form-copy_button",
    "preview_of_email": "sar-form-preview_of_email",
    "preview_of_email_to": "sar-form-preview_of_email_to",
    "explanation": "sar-form-explanation",
    "to_fill_in": "sar-form-to_fill_in",
    "mailto_template_name": "sar-form-mailto_template_name",
};

const t = TRANSLATION_FIELDS;

const DEFAULT_TRANSLATIONS = {
    [t.subject]: "Subject",
    [t.app_type_name]: "Dating app",
    [t.select_placeholder]: "Click to choose",
    [t.email_button]: "Open in your e-mail client",
    [t.body_placeholder]: "Choose an app to fill this automatically",
    [t.recipient]: "Recipient",
    [t.carbon_copy]: "Copy to",
    [t.search_placeholder]: "Search",
    [t.copy_button]: "Copy to clipboard",
    [t.preview_of_email]: "Preview of the e-mail",
    [t.preview_of_email_to]: "Preview of the e-mail to",
    [t.explanation]: "You can copy the e-mail fields or open it directly in your e-mail client",
    [t.to_fill_in]: "The following information needs to be filled in by hand in the e-mail body:",
    [t.mailto_template_name]: TEMPLATE_MAILTO_ACCESS
};

const IDS = {
    search: 'dating-app-search',
    body: 'email-body',
    recipient: 'email-recipient',
    carbonCopyCheck: 'email-cc-check',
    subject: 'email-subject',
    carbonCopy: 'email-cc',
    partsToFillIn: 'email-parts-to-fill-in'
};

function compareItemLabel(appA, appB) {
    const nameA = appA.itemLabel.toUpperCase();
    const nameB = appB.itemLabel.toUpperCase();
    if (nameA < nameB) { return -1; }
    if (nameA > nameB) { return 1; }
    return 0;
}

const unCamelCase = (string) => string.replace(/([a-z])([A-Z])/g, '$1 $2');

/**
 * <sar-form› custom element that helps the user
 * make subject access request by email.
 *
 * Attributes:
 *
 *   lang (optional): String
 *     Determines what language configuration will be
 *     loaded from file /assets/i18n/component-translations.json
 *
 *   collective (optional): String
 *     Id of a project in the wikibase of personaldata io.
 *     If collective is not set, or an empty string,
 *     the option organizationType is used to determine
 *     the targeted organizations
 *     Examples:
 *     - Q5393: the eyeballs
 *
 *   organizationType (optional): String
 *     Id of a company type in the wikibase of personaldata io.
 *     If organizationType is not set, or an empty string,
 *     the list of organizations is loaded from file
 *     /assets/data/sar-organizations.json
 *     Examples:
 *     - Q5066: online dating application
 *     - Q97: transportation network company
 *
 *   mailtoTemplateName (optional): String
 *     Name of a template from personaldata.io
 *     that is used to generate the content of the email.
 *     Default value: MailtoAccess
 *
 *   carbonCopyDescription (optional): String
 *     Label for a checkbox that allows to add a bcc recipient.
 *     If this attribute and carbonCopyRecipient are left empty,
 *     the checkbox is not shown
 *
 *   carbonCopyRecipient (optional): String
 *     Default value for the bcc recipient.
 *     If this attribute and carbonCopyDescription are left empty,
 *     the checkbox to enable bcc is not shown
 *
 * Sample usage:
 *
      <sar-form organizationType="Q5066"
                mailtoTemplateName="MailtoAccess"
                carbonCopyDescription="Send a copy another email address"
                carbonCopyRecipient="bill@microsoft.com"
                lang="en">
      </sar-form>
 */
export class SubjectAccessRequestForm extends LitElement {

/* This is no longer allowed in browsers.
 * Firefox complains with this error message:
 * @import rules are not yet valid in constructed stylesheets.
        @import '/assets/styles/vendor/normalize.css';
        @import '/assets/styles/base/typography.css';
        @import '/assets/styles/base/spacing.css';
        @import '/assets/styles/elements/buttons.css';
        @import '/assets/styles/elements/forms.css';
*/

    static get styles() {
      return css`
        :host {
          display: block; }

        .app-selection {
          display:flex;
          margin-bottom: 0.5rem; }

        .app-selection > label {
          width: 20%; }

        .app-selection > input {
          flex-grow: 1; }

        .email-checkbox{
          margin-bottom: 0.5rem; }

        .email-checkbox > input{
          margin-right: 0.2rem; }

        .email-field {
          display:flex;
          margin-bottom: 0.5rem; }

        .email-field > label {
          width: 20%; }

        .email-field > input {
          flex-grow: 1; }

        .copyIcon {
          cursor: pointer;
          margin-left: 0.5rem; }

        .copyIconSpacer {
          /* same width as the SVG ‹Copy› icon (returned by getCopyIcon() function),
             plus the margin/padding defined by the above 'copyIcon' class */
          min-width: calc( 0.5rem + 24px);
        }

        .email-body{
          display: flex }

        .email-body > textarea {
          flex-grow: 1;
          height: 20em;
          margin-bottom: 1rem; }
      `;
    }

    static get properties() {
        return {
            lang: { type: String },
            organizationType: { type: String },
            collective: { type: String },
            mailtoTemplateName: { type: String },
            organizations: { type: Array, attribute: false },
            selectedApp: { type: Object, attribute: false },
            search: { type: String, attribute: false },
            recipient: { type: String, attribute: false },
            carbonCopyDescription: { type: String },
            carbonCopyRecipient: { type: String },
            carbonCopyChecked: { type: Boolean, attribute: false },
            subject: { type: String, attribute: false },
            body: { type: String, attribute: false },
            partsToFillIn: { type: Array, attribute: false }
        }
    }

    constructor() {
        super();
        this.organizations = [];
        this.organizationType = '';
        this.collective = '';
        this.mailtoTemplateName = this.mailtoTemplateName || TEMPLATE_MAILTO_ACCESS;
        this.selectedApp = undefined;
        this.search = '';
        this.recipient = '';
        this.carbonCopyDescription = '';
        this.carbonCopyRecipient = '';
        this.carbonCopyChecked = false;
        this.subject = '';
        this.body = '';
        this.partsToFillIn = [];
    }

    firstUpdated() {
        // Load the default language
        this.fetchOrganizations();
        registerTranslateConfig({
            loader: async (lang) => {
                try {
                    const result = await fetch(`/assets/i18n/component-translations.json`);
                    const translations = await result.json();
                    return translations[lang] || DEFAULT_TRANSLATIONS;
                } catch (error) {
                    return DEFAULT_TRANSLATIONS;
                }
            }
        });
        use(this.lang);
    }

    async fetchOrganizations() {
        let fetched;
        if(this.collective){
            const collWithPrefix = `pdio:${this.collective}`
            fetched = await fetchOrgsTargetedBy(collWithPrefix);
        }else if(this.organizationType){
            const typeWithPrefix = `pdio:${this.organizationType}`
            fetched = await fetchOrgsOfInstance(typeWithPrefix);
        }else{
            const response = await fetch('/assets/data/sar-organizations.json');
            fetched = await response.json();
        }
        const organizations = fetched.map(app =>
            Object.assign(app,
                { displayName: unCamelCase(app.itemLabel) }))
            .sort(compareItemLabel);
        this.organizations = organizations;
        if(this.organizations.length === 1){
            console.log('found', organizations[0])
            this.selectApp(organizations[0])
        }
    }

    async displayEmail(item) {
        if(item){
            const mailTo = await fetchMailTo(item, this.mailtoTemplateName);
            this.body = mailTo.body;
            this.recipient = mailTo.recipient;
            this.subject = mailTo.subject;
            this.partsToFillIn = mailTo.body.match(/.*<<.*>>/g);
        }
    }

    findOrgByDisplayName(searchString, exactMatch) {
        const found = this.organizations.filter(app => {
            const name = app.displayName.toLowerCase();
            const search = searchString.toLowerCase();
            if (exactMatch) {
                return name === search;
            }
            return name.includes(search);
        });
        return found.length === 1 ? found[0] : undefined;
    }

    onSearch(event){
        const search = event.target;
        const app = this.findOrgByDisplayName(search.value, true);
        if (app) {
            this.selectApp(app);
        }
    }

    async selectApp(app){
        this.selectedApp = app;
        console.log('s', this.selectedApp)
        const search = this.byId(IDS.search);
        if (search) {
            search.value = app.displayName;
        }
        await this.displayEmail(app.item);
    }

    onSearchType(event){
        if(event.key === 'Enter'){
            const search = event.target;
            const app = this.findOrgByDisplayName(search.value);
            if (app) {
                this.selectApp(app);
            }
        }
    }

    onToggleCarbonCopy(event){
        this.carbonCopyChecked = event.target.checked;
    }

    copyToClipboard(textId) {
        const copyText = this.byId(textId);
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        document.execCommand("copy");
    }

    openEmailClient() {
        const email = this.byId(IDS.recipient).value;
        const subject = encodeURIComponent(this.byId(IDS.subject).value);
        const body = encodeURIComponent(this.byId(IDS.body).value);
        let urlString = `mailto:${email}?subject=${subject}&body=${body}`;
        if(this.carbonCopyChecked){
            const carbonCopy =
                  encodeURIComponent(this.byId(IDS.carbonCopy).value);
            urlString += `&cc=${carbonCopy}`
        }
        const url = new URL(urlString);
        window.location.href = url.href;
    }

    getCopyIcon(){
       return svg`<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#000000">
          <path d="M0 0h24v24H0z" fill="none"/>
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
        </svg>`
    }

    render() {
        const that = this;
        let appSelection = '';
        if(this.organizations.length > 1){
            appSelection = html`
          <div class="app-selection"">
            <label for="${IDS.search}">${translate(t.app_type_name)}</label>
            <input placeholder="${translate(t.search_placeholder)}"
                   list="search-list"
                   id="${IDS.search}"
                   @keyup="${that.onSearchType}"
                   @input="${that.onSearch}">
            <datalist  id="search-list">
              ${this.organizations.map(app =>
                html`<option>${app.displayName}</option>`)}
            </datalist>
            <span class="copyIconSpacer">&nbsp;</span>
          </div>
            `;
        }
        let carbonCopyChoice = '';
        if(this.carbonCopyRecipient){
            carbonCopyChoice = html`
          <div class="email-checkbox">
            <input type="checkbox"
                   id="${IDS.carbonCopyCheck}"
                   @change=${that.onToggleCarbonCopy}>
            <label for="${IDS.carbonCopyCheck}">${this.carbonCopyDescription}</label>
          </div>
            `;
        }

        // Adding this to the html would allow configuring the
        // component's style where it is used
        // <link rel="stylesheet" href="/assets/styles/sar-component.css">
        return html`
          ${appSelection}
          <h2>${this.selectedApp
            ? html`${translate(t.preview_of_email_to)}
                <strong>${this.selectedApp.displayName}</strong>`
            : translate(t.preview_of_email)
          }</h2>
          <p>${translate(t.explanation)}</p>
          ${!this.partsToFillIn.length ? '' : html`
          <div class="parts-to-fill-in">
            <p>${translate(t.to_fill_in)}</p>
            <ul>
              ${this.partsToFillIn.map(p => html`<li>${p}</li>`)}
            </ul>
          </div>`}
          <div class="email-field">
            <label for="${IDS.recipient}">${translate(t.recipient)}</label>
            <input id="${IDS.recipient}" type="email" value="${this.recipient}">
            <span class="copyIcon" title="${translate(t.copy_button)}"
                  @click="${_ => that.copyToClipboard(IDS.recipient)}">
              ${this.getCopyIcon()}
            </span>
          </div>
          ${carbonCopyChoice}
          ${this.carbonCopyChecked ?
             html`
          <div class="email-field">
            <label for="${IDS.carbonCopy}">${translate(t.carbon_copy)}</label>
            <input id="${IDS.carbonCopy}" type="text" readonly
                   value="${this.carbonCopyRecipient}" >
            <span class="copyIcon" title="${translate(t.copy_button)}"
                  @click="${_ => that.copyToClipboard(IDS.carbonCopy)}">
               ${this.getCopyIcon()}
             </span>
          </div> `
             : ''}
          <div class="email-field">
            <label for="${IDS.subject}">${translate(t.subject)}</label>
            <input id="${IDS.subject}" type="text" value="${this.subject}">
            <span class="copyIcon" title="${translate(t.copy_button)}"
                  @click="${_ => that.copyToClipboard(IDS.subject)}">
               ${this.getCopyIcon()}
             </span>
          </div>
          <div class="email-body">
            <textarea placeholder="${translate(t.body_placeholder)}"
                      id="${IDS.body}">${this.body}</textarea>
            <span class="copyIcon" title="${translate(t.copy_button)}"
                  @click="${_ => that.copyToClipboard(IDS.body)}">
               ${this.getCopyIcon()}
            </span>
          </div>
          <button @click="${this.openEmailClient}">
            ${translate(t.email_button)}
          </button>
     `;
    }

    byId(id) {
        return this.shadowRoot.querySelector('#' + id);
    }
}

customElements.define('sar-form', SubjectAccessRequestForm);
