import { TemplateCreateDialogComponent } from '../templates/create-dialog.component';
import { alreadyRegisteredException, createDom } from './utils';
import { MatDialog } from '@angular/material/dialog';
import { ToolboxController } from './ToolboxController';
import { TemplateService } from '../templates/template.service';
import { Template } from '../templates/template';
declare const Blockly;

export class TemplateController {
    toolboxController: ToolboxController;
    templatesCategory: HTMLElement;
    dialog: MatDialog;
    templateService: TemplateService;

    registeredTemplateBlocks = false;
    availableTemplates: [string, string][];  // Name, Id
    templates: { [key: string]: Template };

    constructor(
        dialog: MatDialog,
        toolboxController: ToolboxController,
        templateService: TemplateService,
    ) {
        this.dialog = dialog;
        this.toolboxController = toolboxController;
        this.templateService = templateService;
        this.availableTemplates = [];
        this.templates = {};
    }

    register_template_blocks() {
        if ((!this.availableTemplates) || (this.availableTemplates.length === 0)) {
            return;
        }
        if (this.registeredTemplateBlocks) {
            return;
        }

        this.registeredTemplateBlocks = true;

        const availableTemplates = this.availableTemplates;

        Blockly.Blocks['automate_match_template_check'] = {
            init: function () {
                this.jsonInit({
                    'id': 'automate_match_template_check',
                    'message0': 'Does %1 match %2 ?',
                    'args0': [
                        {
                            'type': 'input_value',
                            'name': 'VALUE'
                        },
                        {
                            'type': 'field_dropdown',
                            'name': 'TEMPLATE_NAME',
                            'options': availableTemplates,
                        }
                    ],
                    'category': Blockly.Categories.event,
                    'extensions': ['colours_templates', 'output_string']
                });
            }
        };

        this.templatesCategory.appendChild(createDom('block',
            {
                type: "automate_match_template_check",
                id: "automate_match_template_check",
            }));

        Blockly.Blocks['automate_match_template_stmt'] = {
            init: function () {
                this.jsonInit({
                    'id': 'automate_match_template_stmt',
                    'message0': 'Match %1 with %2',
                    'args0': [
                        {
                            'type': 'input_value',
                            'name': 'VALUE'
                        },
                        {
                            'type': 'field_dropdown',
                            'name': 'TEMPLATE_NAME',
                            'options': availableTemplates,
                        }
                    ],
                    'category': Blockly.Categories.event,
                    'extensions': ['colours_templates', 'shape_statement']
                });
            }
        };

        this.templatesCategory.appendChild(createDom('block',
            {
                type: "automate_match_template_stmt",
                id: "automate_match_template_stmt",
            }));

        this.toolboxController.update();
    }

    injectBlocks(): Function[] {
        try {
            Blockly.Extensions.register('colours_templates',
                function () {
                    this.setColourFromRawValues_('#40BF4A', '#389438', '#308438');
                });
        } catch (e) {
            // If the extension was registered before
            // this would have thrown an inocous exception
            if (!alreadyRegisteredException(e)) {
                throw e;
            }
        }

        return [
            (workspace) => {
                workspace.registerButtonCallback('AUTOMATE_CREATE_TEMPLATE', (x, y, z) => {
                    this.create_template().then(([template_name, template_content]) => {

                        this.templateService.saveTemplate(template_name, template_content)
                            .then((template_creation) => {
                                if (!this.templatesCategory) {
                                    console.error("No templates toolbox found");
                                    return;
                                }

                                this.availableTemplates.push([template_name, template_creation.id]);
                                this.register_template_blocks();

                                this.toolboxController.update();
                            })
                            .catch(err => {
                                console.error(err);
                                alert("Error creating template.\n" + err);
                            })
                    });
                });
            }
        ];
    }

    create_template(): Promise<[string, any[]]> {
        const variables = this.toolboxController.getStringVariables();
        return new Promise((resolve, reject) => {
            const _dialogRef = this.dialog.open(TemplateCreateDialogComponent, {
                data: { template: null, promise: { resolve, reject }, variables: variables }
            });

        });
    }

    genCategory(): Promise<HTMLElement> {
        if (this.templatesCategory) {
            return Promise.resolve(this.templatesCategory);
        }

        const cat = createDom('category', {
            name: "Templates",
            colour: "#40BF4A",
            secondaryColour: "#389438",
            id: "templates",
        })

        cat.appendChild(createDom('button', {
            text: "New template",
            callbackKey: "AUTOMATE_CREATE_TEMPLATE",
        }));

        this.templatesCategory = cat;

        return this.templateService.getTemplates().then((templates) => {
            for (const template of templates) {
                this.templates[template.id] = template;
                this.availableTemplates.push([template.name, template.id]);
            }

            this.register_template_blocks();

            return cat;
        });
    }
}
