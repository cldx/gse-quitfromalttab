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
const Mainloop = imports.mainloop;

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

function resetState(injections) {
	for(let i = 0; i < injections.length; i++){
		injections[i] = {};
		}
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

