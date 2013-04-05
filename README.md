
## keyboard navigator

This is a gnome-shell extension that allows you to select windows in overlay mode by using the left and right arrow keys. A small label indicates the currently selected window. Pressing Enter brings the currently labeled window into focus.

Most of the code in this extension comes from the _Window Navigator extension_ [https://extensions.gnome.org/extension/10/windownavigator/]


### known issues

* the order in which the left and right keys cicle through the overlay windows is not intuitive, because the overlay placement is not taken into account
* I bet someone will run into a bug, when closing windows in overlay mode. The extension doesn't deal with this. But I haven't encountered a problem so far.


