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
const Lang = imports.lang;
const St = imports.gi.St;
const Atk = imports.gi.Atk;
const AltTab = imports.ui.altTab;
const Tweener = imports.ui.tweener;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const ExtendedThumbnailList = Me.imports.extendedThumbnailList;

const THUMBNAIL_FADE_TIME = 0.1; // seconds

let Injections = new Array();
    Injections['AppIconInjections'] = {};
    Injections['AppSwitcherPopupInjections'] = {};

function enable() {
	Convenience.resetState(Injections);
    
    Injections['AppIconInjections']['_init'] = undefined;
        Injections['AppIconInjections']['_init'] = Convenience.injectToFunction(AltTab.AppIcon.prototype, '_init', function() {
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
				let closeButtonY = this.actor.y - 16;
				let closeButtonX = this.actor.x - 16;
				
				this.closeButton = new St.Button({ style_class: 'window-close' });
				this.actor.add_actor(this.closeButton);
				this.closeButton.set_position(Math.floor(closeButtonX), Math.floor(closeButtonY));
				this.closeButton.set_size(32,32);
	
				this.closeButton.connect('clicked', Lang.bind(this,function(){
					/*We don't remove the actor cause there doesn't seem to be any type of _relayout function in AppSwitcher
					*  (cause it was never meant to remove elements while being drawn obviously) and that will look like stuff is broken
					* target custom animations for a future version*/
					this.actor.opacity = 50;
					this.closeButton.opacity=0;
					Convenience.closeWindowInstance(appWindows[0]);
					}));
        	}
		});

	Injections['AppSwitcherPopupInjections']['_createThumbnails'] = undefined;
    Injections['AppSwitcherPopupInjections']['_createThumbnails'] = Convenience.injectToFunction(AltTab.AppSwitcherPopup.prototype, '_createThumbnails', function() {
		/*  destroy the old list so we can inject the new one */
		this._thumbnails.actor.destroy();	

		this._thumbnails = new ExtendedThumbnailList.ExtendedThumbnailList (this._items[this._selectedIndex].cachedWindows);
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
		
		Injections['AppSwitcherPopupInjections']['_keyPressHandler'] = undefined;
		Injections['AppSwitcherPopupInjections']['_keyPressHandler'] = Convenience.injectToFunction(AltTab.AppSwitcherPopup.prototype, '_keyPressHandler', function(keysym, backwards, action) {
			if(keysym == '113'){
				if(this.thumbnailsVisible){
					Convenience.closeWindowInstance(this._items[this._selectedIndex].cachedWindows[this._thumbnails._selected]);	
				}else{
					Convenience.closeWindowInstance(this._items[this._selectedIndex].cachedWindows[0]);
					this._items[this._selectedIndex].actor.opacity = 50;
					this._items[this._selectedIndex].closeButton.opacity=0;
				}
			}
		});
}
	
function disable() {
	 for (i in AppSwitcherPopupInjections) {
        Convenience.removeInjection(AltTab.AppSwitcherPopup.prototype, Injections['AppSwitcherPopupInjections'], i);
		}
	for (i in AppIconInjections) {
        Convenience.removeInjection(AltTab.AppIcon.prototype, Injections['AppIconInjections'], i);
		}
			
	Convenience.resetState(Injections);
}

function init() {
    /* do nothing */
}
