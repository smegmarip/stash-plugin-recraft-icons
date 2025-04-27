const api = window.PluginApi;
const React = api.React;
const { Button, Modal } = api.libraries.Bootstrap;
//const { faImages } = api.libraries.FontAwesomeRegular;
const { useToast } = api.hooks;
const Toast = useToast();

const PLUGIN_ID = 'stash-plugin-recraft-icons';
const DEFAULT_RECRAFT_API_URL =
  'https://external.api.recraft.ai/v1/images/generations';
const DEFAULT_RECRAFT_SIZE = '1024';
const DEFAULT_RECRAFT_FORMAT = 'svg';
const DEFAULT_RECRAFT_STYLE_ID = 'bdb513fc-cf7f-4e0f-be45-ef18bd693d03';

/**
 * Button component for generating icons.
 * @param {Object} params - The component props.
 * @param {string} params.recraftApiKey - The API key for Recraft.
 * @param {string} params.recraftApiUrl - The API URL for Recraft.
 * @param {string} params.recraftTagIconSize - The size of the generated icon.
 */
const ButtonComponent = params => {
  const [display, setDisplay] = React.useState(false);
  const [data, setData] = React.useState(params);
  const enableModal = () => setDisplay(true);
  const disableModal = () => setDisplay(false);
  const modalCallback = mData => {
    console.log('Modal data:', mData);
    disableModal();
  };
  // onClickHandler should result in the fetchTagIcon being called
  // after enabling the modal
  const buttonInstance = React.createElement(DetailButton, {
    onClickHandler: enableModal,
  });

  attachButton(buttonInstance);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(CustomModal, {
      displayState: display,
      onCloseHandler: disableModal,
      onSaveHandler: modalCallback,
      dataState: data,
      onChangeHandler: n => setData(n),
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
const DetailButton = ({ onClickHandler }) => {
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
  dataState,
  onChangeHandler,
}) => {
  // onChangeHandler shoud fire with the image url of the icon preview
  // that is displayed in the modal
  return React.createElement(
    Modal,
    { show: displayState, onHide: onCloseHandler },
    React.createElement(
      Modal.Header,
      { closeButton: true },
      React.createElement(Modal.Title, null, 'Notes'),
    ),
    React.createElement(
      Modal.Body,
      null,
      React.createElement('div', {
        className: 'icon-preview',
      }),
      React.createElement('span', null, 'Please wait... <spinner here>'),
    ),
    React.createElement(
      Modal.Footer,
      null,
      React.createElement(
        Button,
        { variant: 'secondary', onClick: onCloseHandler },
        'Close',
      ),
      React.createElement(
        Button,
        { variant: 'primary', onClick: () => onSaveHandler(dataState) },
        'Save Changes',
      ),
    ),
  );
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
  // Define an effect hook to modify the DOM after render
  React.useEffect(() => {
    const toolbar = document.querySelector('.details-edit');
    if (!toolbar) {
      console.warn('.details-edit not found!');
      return;
    }

    // Render the React button into the toolbar
    api.ReactDOM.render(btnInstance, toolbar);
  }, []); // Empty dependency array -> run only once
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
 * @returns {Promise<string>} - A promise that resolves with the image URL.
 */
const fetchTagIcon = async (params, tagName) => {
  console.log(`Creating icon for ${tagName}...`);
  const {
    recraftApiKey,
    recraftApiUrl,
    recraftTagIconSize,
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
 * Utility function to delay execution for a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise} - A promise that resolves after the specified delay.
 */
const _delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Utility function to notify the user with a message.
 * @param {string} type - The type of notification (e.g., 'success', 'error').
 * @param {string} title - The title of the notification.
 * @param {string} message - The message to display in the notification.
 */
const notify = (type, title, message) => {
  // Updates the modal with the new message
};

(function () {
  'use strict';

  const { getPluginConfig, updatePluginConfig } = window.stashFunctions;
  const csLib = window.csLib;

  /**
   * Retrieves the tag for a given tag id.
   *
   * @param {number} tagId - The id of the tag to retrieve.
   * @returns {Promise<string>} - A promise that resolves with the tag ID.
   */
  const findTagById = async function (tagId) {
    const reqData = {
      query: `{
          findTag(id: ${tagId})
        }`,
    };
    var result = await csLib.callGQL(reqData);

    if ('findTag' in result) {
      return result.findTag;
    }
    return null;
  };

  /**
   * Updates the tag image with the provided URL.
   * @param {string} tagId - The ID of the tag to update.
   * @param {string} imageUrl - The URL of the new image.
   * @param {string} tagName - The name of the tag.
   * @returns {Promise<void>}
   * @throws {Error} If the update fails.
   * @description This function sends a GraphQL mutation to update the tag image.
   * It logs the result and shows a success or error message based on the outcome.
   */
  const updateTagImage = async (tagId, imageUrl, tagName) => {
    console.log(`Updating tag ${tagId} with image ${imageUrl}`);
    const query = `
          mutation TagUpdate($input: TagUpdateInput!) {
              tagUpdate(input: $input) {
              id
              }
          }
      `;
    const reqData = {
      query: query,
      variables: {
        id: tagId,
        image: imageUrl,
      },
    };
    const result = await csLib.callGQL(reqData);

    if (result?.tagUpdate?.id) {
      Toast.success('Generated icon for:', tagName);
      notify('success', 'Success', `Tag '${tagName}' updated successfully!`);
    } else {
      console.error(result);
      throw new Error(`Failed to update tag: ${tagName}`);
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
    getPluginConfig('stashNewPerformerFilterButton').then(config => {
      setupPluginDefaults(config)
        .then(settings => {
          const {
            recraftApiKey,
            recraftApiUrl,
            recraftTagIconSize,
            recraftTagIconFormat,
            recraftTagIconStyleId,
          } = settings;
          const pluginEnabled = recraftApiKey && recraftApiUrl;
          const tagId = getTagId();

          if (pluginEnabled && tagId) {
            findTagById(tagId).then(tag => {
              if (tag) {
                const tagName = tag.name;
                const parents = tag.parents
                  .map(parent => parent.name)
                  .join(', ');
                const buttonInstance = React.createElement(ButtonComponent, {
                  recraftApiKey,
                  recraftApiUrl,
                  recraftTagIconSize,
                  recraftTagIconFormat,
                  recraftTagIconStyleId,
                  parents,
                  tagName,
                  tagId,
                });
                const root = document.querySelector('root');
                api.ReactDOM.render(buttonInstance, root);
              } else {
                console.error('Tag not found');
              }
            });
          } else {
            Toast.error('Plugin not enabled or tag ID not found');
            console.error('Plugin not enabled or tag ID not found');
          }
        })
        .catch(error => {
          console.error('Error setting up plugin defaults:', error);
          Toast.error('Error setting up plugin defaults.');
        });
    });
  };

  const setupPluginDefaults = async params => {
    const {
      recraftApiKey,
      recraftApiUrl = DEFAULT_RECRAFT_API_URL,
      recraftTagIconSize = DEFAULT_RECRAFT_SIZE,
      recraftTagIconFormat = DEFAULT_RECRAFT_SIZE,
      recraftTagIconStyleId,
    } = params;

    return new Promise((resolve, reject) => {
      if (!recraftApiUrl || !recraftTagIconSize || !recraftTagIconFormat) {
        const result = updatePluginConfig(PLUGIN_ID, {
          recraftApiKey,
          recraftApiUrl,
          recraftTagIconSize,
          recraftTagIconFormat,
          recraftTagIconStyleId,
        });

        if (result && result.configurePlugin) {
          resolve(result.configurePlugin);
        } else {
          reject(new Error('Failed to update plugin configuration'));
        }
      } else {
        resolve(params);
      }
    });
  };

  csLib.PathElementListener('/tag', '.details-edit', function () {
    if (!document.getElementById('generate-icon')) {
      initializePlugin();
    }
  });
})();
