"""
Recraft plugin for Stash
This script is designed to be run as a plugin task in Stash.
It will generate icons for the Recast plugin based on the provided configuration.
"""

import json
import os
import sys
import requests

os.chdir(os.path.dirname(os.path.realpath(__file__)))

try:
    import stashapi.log as log
    from stashapi.stashapp import StashInterface
except ModuleNotFoundError:
    print(
        "You need to install the stashapp-tools (stashapi) python module. (CLI: pip install stashapp-tools)",
        file=sys.stderr,
    )

pluginhumanname = "stash-plugin-recraft-icons"


def stash_log(*args, **kwargs):
    """
    The stash_log function is used to log messages from the script.

    :param *args: Pass in a list of arguments
    :param **kwargs: Pass in a dictionary of key-value pairs
    :return: The message
    :doc-author: Trelent
    """
    messages = []
    for input in args:
        if not isinstance(input, str):
            try:
                messages.append(json.dumps(input, default=default_json))
            except:
                continue
        else:
            messages.append(input)
    if len(messages) == 0:
        return

    lvl = kwargs["lvl"] if "lvl" in kwargs else "info"
    message = " ".join(messages)

    if lvl == "trace":
        log.trace(message)
    elif lvl == "debug":
        log.debug(message)
    elif lvl == "info":
        log.info(message)
    elif lvl == "warn":
        log.warning(message)
    elif lvl == "error":
        log.error(message)
    elif lvl == "result":
        log.result(message)
    elif lvl == "progress":
        try:
            progress = min(max(0, float(args[0])), 1)
            log.progress(str(progress))
        except:
            pass


def default_json(t):
    """
    The default_json function is used to convert a Python object into a JSON string.
    The default_json function will be called on every object that is returned from the StashInterface class.
    This allows you to customize how objects are converted into JSON strings, and thus control what gets sent back to the client.

    :param t: Pass in the time
    :return: The string representation of the object t
    :doc-author: Trelent
    """
    return f"{t}"


def exit_plugin(msg=None, err=None):
    """
    The exit_plugin function is used to exit the plugin and return a message to Stash.
    It takes two arguments: msg and err. If both are None, it will simply print &quot;plugin ended&quot; as the output message.
    If only one of them is None, it will print that argument as either an error or output message (depending on which one was not None).
    If both are not none, then it will print both messages in their respective fields.

    :param msg: Display a message to the user
    :param err: Print an error message
    :return: A json object with the following format:
    :doc-author: Trelent
    """
    if msg is None and err is None:
        msg = pluginhumanname + " plugin ended"
    output_json = {}
    if msg is not None:
        stash_log(f"{msg}", lvl="debug")
        output_json["output"] = msg
    if err is not None:
        stash_log(f"{err}", lvl="error")
        output_json["error"] = err
    print(json.dumps(output_json))
    sys.exit()


def get_plugin_settings():
    """
    The get_plugin_settings function is used to get the plugin settings from the StashInterface.

    :return: A dictionary of plugin settings
    :doc-author: Trelent
    """
    global stash
    try:
        settings = stash.find_plugin_config(pluginhumanname)
        if settings is None:
            return None
        return settings
    except Exception as e:
        stash_log(f"Error getting plugin settings: {e}", lvl="error")
        return {}


import requests


def fetch_tag_icon(params, tag_name):
    """
    Fetches the tag icon from the Recraft API and returns the image URL.

    :param params: dict - API request parameters.
    :param tag_name: str - The name of the tag.
    :return: str - Image URL
    """
    stash_log(f"Fetching icon for {tag_name}...", lvl="debug")

    recraft_api_key = params.get("recraftApiKey")
    recraft_api_url = params.get("recraftApiUrl")
    recraft_tag_icon_size = params.get("recraftTagIconSize")
    recraft_tag_icon_style_id = params.get("recraftTagIconStyleId")
    recraft_tag_icon_style = params.get("recraftTagIconStyle")
    recraft_tag_icon_sub_style = params.get("recraftTagIconSubStyle")

    headers = {
        "Authorization": f"Bearer {recraft_api_key}",
        "Content-Type": "application/json",
        "Prefer": "wait",
    }

    payload = {
        "size": f"{recraft_tag_icon_size}x{recraft_tag_icon_size}",
        "prompt": tag_name,
        "model": "recraftv2",
    }

    if recraft_tag_icon_style_id is not None and recraft_tag_icon_style_id != "":
        payload["style"] = recraft_tag_icon_style_id
    else:
        if recraft_tag_icon_style is not None and recraft_tag_icon_style != "":
            payload["style"] = recraft_tag_icon_style
        if recraft_tag_icon_sub_style is not None and recraft_tag_icon_sub_style != "":
            payload["sub_style"] = recraft_tag_icon_sub_style

    try:
        response = requests.post(recraft_api_url, headers=headers, json=payload)
        response.raise_for_status()
    except requests.RequestException as e:
        stash_log(f"Error fetching image: {e}", lvl="error")
        return None

    data = response.json()
    if data.get("data") and len(data["data"]) > 0:
        image_url = data["data"][0]["url"]
        stash_log(f"Got image URL for {tag_name}: {image_url}", lvl="info")
        return image_url
    else:
        stash_log(f"No image generated for: {tag_name}", data, lvl="error")
        return None


def main():
    """
    The main function is the entry point for this plugin.

    :return: A string
    :doc-author: Trelent
    """
    global stash
    json_input = json.loads(sys.stdin.read())
    FRAGMENT_SERVER = json_input["server_connection"]
    stash = StashInterface(FRAGMENT_SERVER)

    ARGS = False
    PLUGIN_ARGS = False

    # Task Button handling
    try:
        PLUGIN_ARGS = json_input["args"]["mode"]
        ARGS = json_input["args"]
    except:
        pass

    if PLUGIN_ARGS:
        stash_log("--Starting " + pluginhumanname + " Plugin --", lvl="debug")

        if "recraftTagIcon" in PLUGIN_ARGS:
            stash_log("running recraftTagIcon", lvl="info")
            if "tagName" in ARGS:
                tagName = ARGS["tagName"]
                if tagName is not None and tagName != "":
                    settings = get_plugin_settings()
                    if settings is None:
                        stash_log("No plugin settings found", lvl="error")
                        exit_plugin(msg="No plugin settings found")
                    else:
                        result = fetch_tag_icon(settings, tagName)
                        if result is not None:
                            stash_log("recraftTagIcon =", {"url": result}, lvl="info")
                            exit_plugin(msg="ok")
            stash_log("recraftTagIcon =", {"url": None}, lvl="info")

    exit_plugin(msg="ok")


if __name__ == "__main__":
    main()
