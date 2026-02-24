# Thunderbird Extension: Trash Incinerator

A Thunderbid Extension to Incinerate (Permenently Delete) ALL
messages in Trash Folder for the currently active Email Account.

It provides for a button that you can pin to the Main Toolbar.

The button is disabled when the Trash Folder for the currently
active Email Account is empty. It enables itself when the Trash
Folder is NOT empty.



## Options

There are three options that can be configured on the Extension's Options Page:
- Confirm before Incinerating
- Incinerate messages in Sub-Folders as well
- Also Delete the Sub-Folders after Incinerating Messages

### Confirm before Incinerating 

    If this checkbox is checked, a Confirmation Dialog will be displayed
    before Incineration is performed.

    This is checked by default.

### Incinerate messages in Sub-Folders as well

    If this checkbox is checked, messages in any Sub-Folders of the
    Trash Folder will also be Incinerated.

    This is checked by default.

###  Also Delete the Sub-Folders after Incinerating Messages

    If this checkbox is checked, and "Incinerate messages in Sub-Folders
    as well" is also checked, any Sub-Folders of the Trash Folder will
    be deleted after messages have been Incinerated.

    This is checked by default.

    There is currently seems to be a problem with Thunderbird where
    sometimes this folder deletion will fail.


## Notes

    If you have more than one Email Account configured with Thunderbird,
    you will have noted that each such Account has its own Trash Folder.

    Because of how Thunderbird works, there can be only one Trash
    Incinerator button - there cannot be a separate button for each
    Email Account's Trash Folder.  So the way this must work is, you
    must select a Folder for your Account to Incinerate the messages
    in the Trash Folder for that Account.

    Therefore, the Toolbar button is enabled only if the Trash Folder
    for the Account for the currently-selected folder is not empty.

    The idea is that incinerating the messages in ALL Trash Folders
    might be too dangerous.

    This is a pure Thunderbird Web Extension and doesn't use any
    Experiment APIs.
