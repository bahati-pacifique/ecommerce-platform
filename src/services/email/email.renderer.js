import path from "node:path";
import { render } from "@maizzle/framework";

//const emailDirectory = path.resolve("./src/services/email/templates");
import { fileURLToPath } from 'node:url';

// Recreate __dirname manually
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const emailDirectory = path.resolve(__dirname, 'templates');

export async function renderEmail(template, props = {}) {

    const templatePath = path.join(
        emailDirectory,
        `${template}.vue`
    );

    const { html } = await render(
        templatePath,
        {
            props
        }
    );

    return html;
}