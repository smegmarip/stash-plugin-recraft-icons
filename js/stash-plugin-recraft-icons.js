(function (window, document) {
  'use strict';

  const api = window.PluginApi;
  const React = api.React;
  const { Button, Modal, Spinner, Dropdown } = api.libraries.Bootstrap;
  //const { faImages } = api.libraries.FontAwesomeRegular;
  const { useToast } = api.hooks;
  const {
    getPluginConfig,
    updatePluginConfig,
    runPluginTask,
    pollLogsForMessage,
  } = window.stashFunctions;
  const csLib = window.csLib;

  const PLUGIN_ID = 'stash-plugin-recraft-icons';
  const DEFAULT_RECRAFT_API_URL =
    'https://external.api.recraft.ai/v1/images/generations';
  const DEFAULT_RECRAFT_SIZE = '1024';
  const DEFAULT_RECRAFT_FORMAT = 'svg';
  //const DEFAULT_RECRAFT_STYLE_ID = 'bdb513fc-cf7f-4e0f-be45-ef18bd693d03';
  const DEFAULT_RECRAFT_STYLE = 'icon';
  const DEFAULT_RECRAFT_SUB_STYLE = 'doodle_offset_fill';

  /**
   * Button component for generating icons.
   * @param {Object} params - The component props.
   * @param {string} params.recraftApiKey - The API key for Recraft.
   * @param {string} params.recraftApiUrl - The API URL for Recraft.
   * @param {string} params.recraftTagIconSize - The size of the generated icon.
   * @param {string} params.recraftTagIconStyle - The style of the generated icon.
   * @param {string} params.recraftTagIconSubStyle - The sub-style of the generated icon.
   * @param {string} params.recraftTagIconStyleId - The style ID of the generated icon.
   * @param {string} params.tagName - The name of the tag.
   * @param {string} params.parents - The parent tags of the tag.
   * @param {string} params.tagId - The ID of the tag.
   * @returns {JSX.Element} - The rendered button component.
   */
  const ButtonComponent = params => {
    const Toast = useToast();
    const [display, setDisplay] = React.useState(false);
    const [data, setData] = React.useState(params);
    const [custom, setCustom] = React.useState(false);
    const [imageUrl, setImageUrl] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    /**
     * Callback function to enable the modal.
     * @returns {Promise<void>}
     * @description This function sets the display state to true, fetches the tag icon,
     * and updates the image URL in the state. It also handles loading state.
     */
    const enableModal = async (enableCustom = false) => {
      setDisplay(true);
      setCustom(enableCustom);
      if (!enableCustom) {
        performTagFetch();
      }
    };

    /**
     * Callback function to disable the modal.
     * @returns {void}
     * @description This function sets the display state to false, clears the image URL,
     * and resets the loading state.
     */
    const disableModal = () => {
      setDisplay(false);
      setImageUrl('');
      setLoading(false);
    };

    /**
     * Fetches the tag icon and updates the image URL in the state.
     * @returns {Promise<void>}
     */
    const performTagFetch = async (customPrompt = null) => {
      setCustom(false);
      setLoading(true);

      const iconQuery = customPrompt || data.tagName;

      try {
        const url = await fetchTagIcon(data, iconQuery, Toast);
        setImageUrl(url);
        setData(prev => ({ ...prev, imageUrl: url }));
      } catch (e) {
        console.error('Error fetching icon:', e);
      }
      setLoading(false);
    };

    /**
     * Callback function to handle modal save action.
     * @param {Object} mData - The data from the modal.
     * @param {string} mData.tagId - The ID of the tag.
     * @param {string} mData.imageUrl - The URL of the image.
     * @param {string} mData.tagName - The name of the tag.
     * @returns {Promise<void>}
     * @throws {Error} If the update fails.
     */
    const modalCallback = async mData => {
      try {
        const tag = await updateTagImage(mData, Toast);
        if (tag && tag.image_path) {
          setLocalTagImage(tag.image_path);
        }
      } catch (e) {
        console.error('Failed to update tag image:', e);
      }
      disableModal();
    };

    /**
     * Attaches a button instance to the toolbar.
     * @param {React.Component} btnInstance - The button instance to attach.
     * @returns {void}
     * @description This function uses the useEffect hook to render the button instance
     * into the toolbar once the component mounts. It also handles cleanup by unmounting
     * the button when the component unmounts.
     */
    const attachButton = btnInstance => {
      React.useEffect(() => {
        const toolbar = document.querySelector('.details-edit');
        if (!toolbar) {
          console.warn('.details-edit not found!');
          return;
        }
        const toolbarChild = document.createElement('div');
        toolbarChild.className = 'recraft-icon-button';
        toolbar.appendChild(toolbarChild);
        api.ReactDOM.render(btnInstance, toolbarChild);
      }, []);
    };

    const buttonInstance = React.createElement(DropdownDetailButton, {
      options: [
        { onClickHandler: _e => enableModal(false), label: 'Generate Icon' },
        {
          onClickHandler: _e => enableModal(true),
          label: 'Generate Custom Icon',
        },
      ],
    });

    attachButton(buttonInstance);

    return React.createElement(
      React.Fragment,
      null,
      React.createElement(CustomModal, {
        displayState: display,
        onCloseHandler: disableModal,
        onSaveHandler: modalCallback,
        onChangeHandler: performTagFetch,
        onRefreshHandler: performTagFetch,
        dataState: data,
        loadingState: loading,
        imageUrlState: imageUrl,
        customState: custom,
      }),
    );
  };

  /**
   * Button component for generating icons.
   * @param {Object} props - The component props.
   * @param {function} props.onClickHandler - Function to handle button click.
   * @returns {JSX.Element} - The rendered button component.
   * @description This component creates a button that triggers the icon generation process.
   * It uses the Bootstrap Button component and applies custom styles.
   */
  const _DetailButton = ({ onClickHandler }) => {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        Button,
        {
          className: 'generate-icon btn btn-secondary',
          id: 'generate-icon',
          title: 'Generate Icon',
          onClick: onClickHandler,
        },
        'Generate Icon',
      ),
    );
  };

  /**
   * Dropdown button component for generating icons.
   * @param {Object} props - The component props.
   * @param {Array} props.options - Array of options for the dropdown menu.
   * @param {function} props.options[].onClickHandler - Function to handle option click.
   * @param {string} props.options[].label - Label for the dropdown option.
   * @returns {JSX.Element} - The rendered compound button component.
   */
  const DropdownDetailButton = ({ options = [] }) => {
    return React.createElement(
      Dropdown,
      { className: 'generate-icon-dropdown' },
      React.createElement(
        Dropdown.Toggle,
        {
          variant: 'secondary',
          id: 'generate-icon-dropdown-toggle',
          className: 'btn btn-secondary',
        },
        'Generate Icon',
        '...',
      ),
      React.createElement(
        Dropdown.Menu,
        { className: 'bg-secondary text-white', id: 'generate-icon-menu' },
        options.map((option, index) =>
          React.createElement(
            Dropdown.Item,
            {
              key: index,
              className: 'bg-secondary text-white',
              onClick: option.onClickHandler,
            },
            option.label,
          ),
        ),
      ),
    );
  };

  /**
   * Custom modal component for displaying tag image and a spinner.
   * @param {Object} props - The component props.
   * @param {boolean} props.displayState - State to control modal visibility.
   * @param {function} props.onCloseHandler - Function to handle modal close.
   * @param {function} props.onSaveHandler - Function to handle save action.
   * @param {Object} props.dataState - State to hold data.
   * @param {function} props.onChangeHandler - Function to handle data change.
   * @returns {JSX.Element} - The rendered modal component.
   */
  const CustomModal = ({
    displayState,
    onCloseHandler,
    onSaveHandler,
    onChangeHandler,
    onRefreshHandler,
    dataState,
    loadingState,
    imageUrlState,
    customState,
  }) => {
    // State to hold the prompt value
    const [prompt, setPrompt] = React.useState(dataState.tagName);

    /**
     * Custom prompt component for entering a custom prompt.
     * @param {string} tagName - The name of the tag.
     * @returns {JSX.Element} - The rendered custom prompt component.
     */
    const customPrompt = () => {
      return React.createElement(
        'div',
        { className: 'input-group mb-3' },
        React.createElement('input', {
          id: 'custom-icon-prompt',
          placeholder: 'Enter custom prompt',
          'aria-label': 'Custom prompt',
          className: 'text-input form-control mr-3',
          type: 'text',
          value: prompt,
          onChange: e => {
            setPrompt(e.target.value);
          },
        }),
        React.createElement(
          'button',
          {
            className: 'btn btn-primary',
            id: 'update-icon-prompt',
            onClick: _e => onChangeHandler(prompt),
          },
          'Submit',
        ),
      );
    };

    /**
     * Loading indicator component for displaying a spinner and message.
     * @param {string} message - The message to display.
     * @returns {JSX.Element} - The rendered loading indicator component.
     */
    const loadingIndicator = message =>
      React.createElement(
        'div',
        { className: 'ml-auto mr-auto text-center' },
        React.createElement(Spinner, {
          animation: 'border',
          role: 'status',
        }),
        React.createElement(
          'h4',
          { className: 'LoadingIndicator-message' },
          message,
        ),
      );

    /**
     * Image preview component for displaying the generated image.
     * @param {string} url - The URL of the image.
     * @returns {JSX.Element} - The rendered image preview component.
     */
    const imagePreview = url =>
      React.createElement(
        'div',
        { className: 'performer-card card ml-auto mr-auto' },
        React.createElement(
          'div',
          { className: 'thumbnail-section' },
          React.createElement('img', {
            src: url,
            style: { maxWidth: '100%' },
            alt: 'Generated Icon',
            title: 'Generated Icon for ' + dataState.tagName,
          }),
        ),
      );

    return React.createElement(
      Modal,
      { show: displayState, onHide: onCloseHandler },
      React.createElement(
        Modal.Header,
        { closeButton: true },
        React.createElement(Modal.Title, null, 'Generate Icon'),
      ),
      React.createElement(
        Modal.Body,
        null,
        customState
          ? customPrompt(dataState.tagName)
          : loadingState
            ? loadingIndicator('Generating icon...')
            : imageUrlState
              ? imagePreview(imageUrlState)
              : null,
      ),
      React.createElement(
        Modal.Footer,
        null,
        React.createElement(
          Button,
          { variant: 'secondary', onClick: onCloseHandler },
          'Close',
        ),
        imageUrlState
          ? React.createElement(
              Button,
              {
                variant: 'success',
                onClick: () => onRefreshHandler(prompt),
              },
              'Refresh',
            )
          : null,
        imageUrlState
          ? React.createElement(
              Button,
              { variant: 'primary', onClick: () => onSaveHandler(dataState) },
              'Update Image',
            )
          : null,
      ),
    );
  };

  /**
   * Returns an array containing the scenario and scenario ID extracted from the current URL.
   * @returns {Array<string>} An array containing the scenario and scenario ID.
   */
  const getTagId = function () {
    var result = document.URL.match(/(tags)\/(\d+)/);
    return result[2];
  };

  /**
   * Fetches the tag icon from the Recraft API and returns the image URL.
   * @param {Object} params - The parameters for the API request.
   * @param {string} tagName - The name of the tag.
   * @param {Object} Toast - The Toast object for displaying messages.
   * @returns {Promise<string>} - A promise that resolves with the image URL.
   */
  const _fetchTagIcon = async (params, tagName, Toast) => {
    console.log(`Creating icon for ${tagName}...`);
    const {
      recraftApiKey,
      recraftApiUrl,
      recraftTagIconSize,
      recraftTagIconStyle,
      recraftTagIconSubStyle,
      recraftTagIconStyleId,
    } = params;
    let response;
    try {
      response = await fetch(recraftApiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${recraftApiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'wait',
        },
        body: JSON.stringify({
          size: `${recraftTagIconSize}x${recraftTagIconSize}`,
          prompt: tagName,
          style: recraftTagIconStyle,
          sub_style: recraftTagIconSubStyle,
          style_id: recraftTagIconStyleId,
          model: 'recraftv2',
        }),
      });
    } catch (_e) {
      Toast.error('Error fetching image:', _e);
      console.error('Error fetching image:', _e);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const imageUrl = data.data[0].url;
      console.log(`Got image URL for ${tagName}: ${imageUrl}`);
      return imageUrl;
    } else {
      console.error('No image generated for:', tagName, data);
      throw new Error(`No image generated for: ${tagName}`);
    }
  };

  /**
   * Fetches the tag icon from the Recraft API and returns the image URL.
   * @param {Object} params - The parameters for the API request.
   * @param {string} tagName - The name of the tag.
   * @param {Object} Toast - The Toast object for displaying messages.
   * @returns {Promise<string>} - A promise that resolves with the image URL.
   */
  const fetchTagIcon = async (params, tagName, Toast) => {
    const task = 'Recraft Tag Icon',
      operation = 'recraftTagIcon',
      prefix = `[Plugin / Recraft Tag Icons] ${operation} =`,
      reqTime = Date.now(),
      payload = [
        { key: 'name', value: { str: operation } },
        { key: 'tagName', value: { str: `${tagName}` } },
      ];
    return new Promise((resolve, reject) => {
      try {
        runPluginTask(PLUGIN_ID, task, payload).then(() => {
          // Poll logs until plugin task output appears
          pollLogsWithRetries(prefix, reqTime, tagName, 5)
            .then(imageUrl => {
              console.log(`Got image URL for ${tagName}: ${imageUrl}`);
              resolve(imageUrl);
            })
            .catch(error => {
              Toast.error('Error fetching image for:', tagName);
              console.error('No image generated for:', tagName);
              reject(error);
            });
        });
      } catch (error) {
        Toast.error('Error fetching image for:', tagName);
        console.error('Error fetching image:', error);
        reject(error);
      }
    });
  };

  /**
   * Polls the logs for a specific message and retries if necessary.
   * @param {string} prefix - The prefix to search for in the logs.
   * @param {number} reqTime - The request time for the logs.
   * @param {string} tagName - The name of the tag.
   * @param {Object} Toast - The Toast object for displaying messages.
   * @param {number} maxRetries - The maximum number of retries.
   * @returns {Promise<string>} - A promise that resolves with the image URL.
   */
  const pollLogsWithRetries = async (
    prefix,
    reqTime,
    tagName,
    maxRetries = 5,
  ) => {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const tryPollLogs = () => {
        pollLogsForMessage(prefix, 'Info', reqTime)
          .then(result => {
            const parsedResult = JSON.parse(result.trim());
            if (parsedResult && parsedResult.url) {
              console.log(`Got image URL for ${tagName}: ${parsedResult.url}`);
              resolve(parsedResult.url);
            } else {
              reject(new Error(`No image generated for: ${tagName}`));
            }
          })
          .catch(error => {
            attempts++;
            console.warn(
              `Message poll attempt ${attempts} failed for ${tagName}. Retrying...`,
            );
            if (attempts >= maxRetries) {
              reject(error);
            } else {
              tryPollLogs();
            }
          });
      };
      tryPollLogs();
    });
  };

  /**
   * Updates the tag image with the provided URL.
   * @param {Object} params - The parameters for the update.
   * @param {string} params.tagId - The ID of the tag to update.
   * @param {string} params.imageUrl - The URL of the new image.
   * @param {string} params.tagName - The name of the tag.
   * @param {Object} Toast - The Toast object for displaying messages.
   * @returns {Promise<Object>} - A promise that resolves with the updated tag.
   * @throws {Error} If the update fails.
   * @description This function sends a GraphQL mutation to update the tag image.
   * It logs the result and shows a success or error message based on the outcome.
   */
  const updateTagImage = async (params, Toast) => {
    const { tagId, imageUrl, tagName } = params;
    console.log(`Updating tag ${tagId} with image ${imageUrl}`);
    const query = `
          mutation TagUpdate($input: TagUpdateInput!) {
              tagUpdate(input: $input) {
                id
                name
                image_path
              }
          }
      `;
    const reqData = {
      query: query,
      variables: {
        input: {
          id: tagId,
          image: imageUrl,
        },
      },
    };
    const result = await window.csLib.callGQL(reqData);

    if (result?.tagUpdate?.id) {
      Toast.success('Generated icon for:', tagName);
      return result.tagUpdate;
    } else {
      console.error('Failed to update tag:', result);
      throw new Error(`Failed to update tag: ${tagName}`);
    }
  };

  /**
   * Retrieves the tag for a given tag id.
   *
   * @param {number} tagId - The id of the tag to retrieve.
   * @returns {Promise<string>} - A promise that resolves with the tag ID.
   */
  const findTagById = async function (tagId) {
    const reqData = {
      variables: {
        id: tagId,
      },
      query: `query FindTag($id: ID!) {
          findTag(id: $id) {
            id
            name
            description
            aliases
            parents {
              id
              name
              description
              aliases
            }
          }
        }`,
    };

    var result = await csLib.callGQL(reqData);

    if (result && 'findTag' in result) {
      return result.findTag;
    }
    return null;
  };

  /**
   * Sets the local tag image to the provided URL.
   * @param {string} imageUrl - The URL of the image to set.
   */
  const setLocalTagImage = function (imageUrl) {
    const tagImage = document.querySelector('.detail-header-image IMG.logo');
    if (tagImage) {
      tagImage.src = imageUrl;
    }
  };

  const cleanUI = function () {
    const existingContainer = document.getElementById(
        'recraft-icon-button-container',
      ),
      existingButtons = document.querySelectorAll('.recraft-icon-button');
    if (existingContainer) {
      existingContainer.remove();
    }
    if (existingButtons.length > 0) {
      existingButtons.forEach(button => button.remove());
    }
  };

  /**
   * Initializes the plugin by fetching the configuration and rendering the button.
   * @returns {void}
   * @description This function retrieves the plugin configuration, checks if the plugin is enabled,
   * and renders the button if the tag ID is found. It also fetches the tag details and creates the button instance.
   * If the tag is not found, it logs an error message.
   * @throws {Error} If the tag is not found.
   * @throws {Error} If the plugin is not enabled.
   */
  const initializePlugin = () => {
    console.log('Initializing Recraft Icons plugin...');
    cleanUI();
    getPluginConfig('stash-plugin-recraft-icons').then(config => {
      setupPluginDefaults(config)
        .then(settings => {
          const tagId = getTagId();
          if (settings.recraftApiKey && settings.recraftApiUrl && tagId) {
            findTagById(tagId).then(tag => {
              if (tag) {
                const buttonInstance = React.createElement(ButtonComponent, {
                  ...settings,
                  tagName: tag.name,
                  parents: tag.parents.map(p => p.name).join(', '),
                  tagId,
                });
                const root = document.querySelector('#root');
                const container = document.createElement('div');
                container.id = 'recraft-icon-button-container';
                root.appendChild(container);
                api.ReactDOM.render(buttonInstance, container);
              } else {
                console.error('Tag not found');
              }
            });
          } else {
            console.error('Plugin not enabled or tag ID not found');
          }
        })
        .catch(error => {
          console.error('Error setting up plugin defaults:', error);
        });
    });
  };

  const setupPluginDefaults = async params => {
    const {
      recraftApiKey,
      recraftTagIconStyleId,
      recraftApiUrl = DEFAULT_RECRAFT_API_URL,
      recraftTagIconSize = DEFAULT_RECRAFT_SIZE,
      recraftTagIconFormat = DEFAULT_RECRAFT_FORMAT,
      recraftTagIconStyle = DEFAULT_RECRAFT_STYLE,
      recraftTagIconSubStyle = DEFAULT_RECRAFT_SUB_STYLE,
    } = params;

    return new Promise((resolve, reject) => {
      if (
        !params.recraftApiUrl ||
        !params.recraftTagIconSize ||
        !params.recraftTagIconFormat
      ) {
        const result = updatePluginConfig(PLUGIN_ID, {
          recraftApiKey,
          recraftApiUrl,
          recraftTagIconSize,
          recraftTagIconFormat,
          recraftTagIconStyle,
          recraftTagIconSubStyle,
          recraftTagIconStyleId,
        });

        if (result && result?.data?.configurePlugin) {
          resolve(result.data.configurePlugin);
        } else {
          reject(new Error('Failed to update plugin configuration'));
        }
      } else {
        resolve(params);
      }
    });
  };

  let debounceTimer = null;

  csLib.PathElementListener('/tag', '.details-edit', function () {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const toolbar = document.querySelector('.details-edit');
      if (
        toolbar &&
        document.querySelectorAll(
          '.details-edit .recraft-icon-button #generate-icon',
        ).length === 0
      ) {
        initializePlugin();
      }
    }, 300); // debounce 300ms
  });
})(window, document);
