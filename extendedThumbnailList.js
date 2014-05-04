// Add Quit Menu Entry to AltTab Switcher
// Copyright (C) 2014 Joern Konopka
// Convenienve Functions stolen from windowoverlay-icons@sustmidown.centrum.cz

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const Lang = imports.lang;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const AltTab = imports.ui.altTab;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const THUMBNAIL_DEFAULT_SIZE = 256;

const ExtendedThumbnailList = new Lang.Class({
	Name: 'ExtendedThumbnailList',
	Extends: AltTab.ThumbnailList,
	
    _init : function(windows) {
		this.parent(false);

        this._labels = new Array();
        this._thumbnailBins = new Array();
        this._clones = new Array();
        this._windows = windows;
        this._closeButtons = new Array();
        this._selected = 0;

        for (let i = 0; i < windows.length; i++) {
			let wrapper = new St.Widget({ layout_manager: new Clutter.BinLayout() });
            let box = new St.BoxLayout({ style_class: 'thumbnail-box', vertical: true });
            let bin = new St.Bin({ style_class: 'thumbnail' });

            box.add_actor(bin);
            this._thumbnailBins.push(bin);
            wrapper.add_actor(box);
						
			let closeButton = new St.Button({ style_class: 'window-close' });
			this._closeButtons.push(closeButton);
			wrapper.add_actor(closeButton);
			/* We make it invisible to make the hover work */
			closeButton.opacity = 0;
			closeButton.connect('clicked', Lang.bind(this, this._closeButtonHandler));
			
			let title = windows[i].get_title();
            if (title) {
                let name = new St.Label({ text: title });
                // St.Label doesn't support text-align so use a Bin
                let bin = new St.Bin({ x_align: St.Align.MIDDLE });
                this._labels.push(bin);
                bin.add_actor(name);
                box.add_actor(bin);
                this.addItem(wrapper, name);
            } else {
                this.addItem(wrapper, null);
            }
        }
        
     },
    
    _itemEntered: function(n) {
        /* we override SwitcherList._itemEntered cause we need a custom _selected var
         * to find the right windows and close buttons */
        this.emit('item-entered', n);
        this._selected = n;
        
		/* retrieve some vals for the button positioning */
		let hPadding = this._items[n].get_theme_node().get_horizontal_padding();
		let vPadding = this._items[n].get_theme_node().get_vertical_padding();
		let buttonSize = this._closeButtons[n].get_theme_node().get_width();
			
        /*Hide all other Close Buttons... */
        for(let i = 0; i < this._closeButtons.length; i++){
			this._closeButtons[i].opacity = 0;
		}
			
		/* ...and only show it on the current selection */
		let closeButtonX = 0;
		let closeButtonY = this._items[n].y - (vPadding + buttonSize/2);
			
		if (Clutter.get_default_text_direction() == Clutter.TextDirection.RTL){
			closeButtonX = closeButtonX - (hPadding/2);
		}else{
			closeButtonX = this._items[n].width - (hPadding/2) - buttonSize;
		}
				
		this._closeButtons[this._selected].set_position(Math.floor(closeButtonX), Math.floor(closeButtonY));
		this._closeButtons[this._selected].opacity = 250;
	},
		
    _closeButtonHandler : function(){
			Convenience.closeWindowInstance(this._windows[this._selected]);
			this._closeButtons[this._selected].destroy();
			this._labels[this._selected].destroy();
	},

	removeItem: function() {
		/* Experimental hackish stuff */
		let actor = this._items[this._selected];
		this._list.remove_actor(actor);
		this._items = this._items.slice(this._selected);
	},

    addClones : function (availHeight) {
        if (!this._thumbnailBins.length)
            return;
        let totalPadding = this._items[0].get_theme_node().get_horizontal_padding() + this._items[0].get_theme_node().get_vertical_padding();
        totalPadding += this.actor.get_theme_node().get_horizontal_padding() + this.actor.get_theme_node().get_vertical_padding();
        let [labelMinHeight, labelNaturalHeight] = this._labels[0].get_preferred_height(-1);
        let spacing = this._items[0].child.get_theme_node().get_length('spacing');

        availHeight = Math.min(availHeight - labelNaturalHeight - totalPadding - spacing, THUMBNAIL_DEFAULT_SIZE);
        let binHeight = availHeight + this._items[0].get_theme_node().get_vertical_padding() + this.actor.get_theme_node().get_vertical_padding() - spacing;
        binHeight = Math.min(THUMBNAIL_DEFAULT_SIZE, binHeight);

        for (let i = 0; i < this._thumbnailBins.length; i++) {
            let mutterWindow = this._windows[i].get_compositor_private();
            if (!mutterWindow)
                continue;

            let clone = AltTab._createWindowClone(mutterWindow, THUMBNAIL_DEFAULT_SIZE);
            this._thumbnailBins[i].set_height(binHeight);
            this._thumbnailBins[i].add_actor(clone);
            this._clones.push(clone);
        }

        // Make sure we only do this once
        this._thumbnailBins = new Array();
    }
});

