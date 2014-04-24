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
const St = imports.gi.St;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const AltTab = imports.ui.altTab;

let quitfromAltTabInjections;

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
  quitfromAltTabInjections = { };
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
    
    quitfromAltTabInjections['_init'] = undefined;
    quitfromAltTabInjections['_init'] = injectToFunction(AltTab.AppIcon.prototype, '_init', function() {
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
	  
}
	

function disable() {
	 for (i in quitfromAltTabInjections) {
        removeInjection(AltTab.AppIcon.prototype, quitfromAltTabInjections, i);
		}
	resetState();
}

function init() {
    /* do nothing */
}
