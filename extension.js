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

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Atk = imports.gi.Atk;
const AltTab = imports.ui.altTab;

const Main = imports.ui.main;
const SwitcherPopup = imports.ui.switcherPopup;
const Tweener = imports.ui.tweener;

const APP_ICON_HOVER_TIMEOUT = 200; // milliseconds

const THUMBNAIL_DEFAULT_SIZE = 256;
const THUMBNAIL_POPUP_TIME = 500; // milliseconds
const THUMBNAIL_FADE_TIME = 0.1; // seconds

const WINDOW_PREVIEW_SIZE = 128;
const APP_ICON_SIZE = 96;
const APP_ICON_SIZE_SMALL = 48;

const iconSizes = [96, 64, 48, 32, 22];

const AppIconMode = {
    THUMBNAIL_ONLY: 1,
    APP_ICON_ONLY: 2,
    BOTH: 3,
};

let AppIconInjections, AppSwitcherPopupInjections;

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
				
			//This should respect RTL/LTR
           	let appButtonX = wrapper.x - 16;
			let appButtonY = wrapper.y - 16;
        
			let closeButton = new St.Button({ style_class: 'window-close' });
			this._closeButtons.push(closeButton);
			wrapper.add_actor(closeButton);
			closeButton.set_position(Math.floor(appButtonX), Math.floor(appButtonY));
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
        /*Hide all other Close Buttons... */
        for(let i = 0; i < this._closeButtons.length; i++){
			this._closeButtons[i].opacity = 0;
			}
		/* ...and only show it on the current selection */
        this._closeButtons[this._selected].opacity = 250;
		},
		
    _closeButtonHandler : function(){
			closeWindowInstance(this._windows[this._selected]);
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

            let clone = _createWindowClone(mutterWindow, THUMBNAIL_DEFAULT_SIZE);
            this._thumbnailBins[i].set_height(binHeight);
            this._thumbnailBins[i].add_actor(clone);
            this._clones.push(clone);
        }

        // Make sure we only do this once
        this._thumbnailBins = new Array();
    }
});

function _createWindowClone(window, size) {
    let windowTexture = window.get_texture();
    let [width, height] = windowTexture.get_size();
    let scale = Math.min(1.0, size / width, size / height);
    return new Clutter.Clone({ source: windowTexture,
                               width: width * scale,
                               height: height * scale,
                               x_align: Clutter.ActorAlign.CENTER,
                               y_align: Clutter.ActorAlign.CENTER,
                               // usual hack for the usual bug in ClutterBinLayout...
                               x_expand: true,
                               y_expand: true });
};     
     
// Convenience Functions
function injectToFunction(parent, name, func) {
    let origin = parent[name];
    parent[name] = function() {
        let ret;
        ret = origin.apply(this, arguments);
        if (ret === undefined)
                ret = func.apply(this, arguments);
        return ret;
    }
    return origin;
}

function removeInjection(object, injection, name) {
    if (injection[name] === undefined)
        delete object[name];
    else
        object[name] = injection[name];
}

function resetState() {
  AppIconInjections = { };
  AppSwitcherPopupInjections = { };
}

function closeWindowInstance(metaWindow){
	let windowClone = metaWindow._delegate;
	let workspace = metaWindow.get_workspace();
	let windowAddedId = workspace.connect('window-added',Lang.bind(this, function(workspace,win){
															Mainloop.idle_add(Lang.bind(this,function() {
																		windowClone.emit('selected');
																		return false;
																	}));
														}));
				metaWindow.delete(global.get_current_time());
	}


function enable() {
	resetState();
    
    AppIconInjections['_init'] = undefined;
        AppIconInjections['_init'] = injectToFunction(AltTab.AppIcon.prototype, '_init', function() {
		this.actor.destroy();
		
		this.actor = new St.Widget({ layout_manager: new Clutter.BinLayout() });
		
		
		this.appBox = new St.BoxLayout({ style_class: 'alt-tab-app',
                                         vertical: true });
        this.icon = null;
        this._iconBin = new St.Bin({ x_fill: true, y_fill: true });

        this.appBox.add(this._iconBin, { x_fill: false, y_fill: false } );
        this.label = new St.Label({ text: this.app.get_name() });
        this.appBox.add(this.label, { x_fill: false });
		this.actor.add_actor(this.appBox);
		
		let appWindows = this.app.get_windows();
		let window_count = appWindows.length;
		
		/*This is somewhat false since the window count also is > 1 if you have f.e. an Export Window open in Inkscape,
		 * look closer at how the App Switcher sorts it out*/
			if(window_count == 1){
				let appButtonX = this.actor.x - 16;
				let appButtonY = this.actor.y - 16;
    
				this.closeButton = new St.Button({ style_class: 'window-close' });
				this.actor.add_actor(this.closeButton);
				this.closeButton.set_position(Math.floor(appButtonX), Math.floor(appButtonY));
				this.closeButton.set_size(32,32);
	
				this.closeButton.connect('clicked', Lang.bind(this,function(){
					/*We don't remove the actor cause there doesn't seem to be any type of _relayout function in AppSwitcher
					*  (cause it was never meant to remove elements while being drawn obviously) and that will look like stuff is broken
					* target custom animations for a future version*/
					this.actor.opacity = 50;
					this.closeButton.opacity=0;
					closeWindowInstance(appWindows[0]);
					}));
        	}
		});

	AppSwitcherPopupInjections['_createThumbnails'] = undefined;
    AppSwitcherPopupInjections['_createThumbnails'] = injectToFunction(AltTab.AppSwitcherPopup.prototype, '_createThumbnails', function() {
		/*  destroy the old list so we can inject the new one */
		this._thumbnails.actor.destroy();	

		this._thumbnails = new ExtendedThumbnailList (this._items[this._selectedIndex].cachedWindows);
        this._thumbnails.connect('item-activated', Lang.bind(this, this._windowActivated));
        this._thumbnails.connect('item-entered', Lang.bind(this, this._windowEntered));

        this.actor.add_actor(this._thumbnails.actor);

        // Need to force an allocation so we can figure out whether we
        // need to scroll when selecting
        this._thumbnails.actor.get_allocation_box();

        this._thumbnails.actor.opacity = 0;
        Tweener.addTween(this._thumbnails.actor,
                         { opacity: 255,
                           time: THUMBNAIL_FADE_TIME,
                           transition: 'easeOutQuad',
                           onComplete: Lang.bind(this, function () { this.thumbnailsVisible = true; })
                         });

        this._switcherList._items[this._selectedIndex].add_accessible_state (Atk.StateType.EXPANDED);
 		
		});
		
		AppSwitcherPopupInjections['_keyPressHandler'] = undefined;
		AppSwitcherPopupInjections['_keyPressHandler'] = injectToFunction(AltTab.AppSwitcherPopup.prototype, '_keyPressHandler', function(keysym, backwards, action) {
			if(keysym == '113'){
				if(this.thumbnailsVisible){
					closeWindowInstance(this._items[this._selectedIndex].cachedWindows[this._thumbnails._selected]);	
				}else{
					closeWindowInstance(this._items[this._selectedIndex].cachedWindows[0]);
					this._items[this._selectedIndex].actor.opacity = 50;
					this._items[this._selectedIndex].closeButton.opacity=0;
				}
			}
		});
}
	

function disable() {
	 for (i in AppSwitcherPopupInjections) {
        removeInjection(AltTab.AppSwitcherPopup.prototype, AppSwitcherPopupInjections, i);
		}
	for (i in AppIconInjections) {
        removeInjection(AltTab.AppIcon.prototype, AppIconInjections, i);
		}
			
	resetState();
}

function init() {
    /* do nothing */
}
