const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const St = imports.gi.St;

const Main = imports.ui.main;
const Workspace = imports.ui.workspace;
const WorkspacesView = imports.ui.workspacesView;

//===============================================
// Some Parameters

let TOOLTIP_CHARACTER = 'O'

//===============================================
// Injection related stuff
//

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

let winInjections, workspaceInjections, workViewInjections, createdActors, connectedSignals;

function resetState() {
    winInjections = { };
    workspaceInjections = { };
    workViewInjections = { };
    createdActors = [ ];
    connectedSignals = [ ];
}

function disable() {
    for (i in workspaceInjections)
        removeInjection(Workspace.Workspace.prototype, workspaceInjections, i);
    for (i in winInjections)
        removeInjection(Workspace.WindowOverlay.prototype, winInjections, i);
    for (i in workViewInjections)
        removeInjection(WorkspacesView.WorkspacesView.prototype, workViewInjections, i);

    for each (i in connectedSignals)
        i.obj.disconnect(i.id);

    for each (i in createdActors)
        i.destroy();

    resetState();
}

function init() {
    /* do nothing */
}


//===============================================
// Extension configuration
//

function enable() {
    resetState();

    // Add Tooltip to overlay windows
    //
    winInjections['_init'] = injectToFunction(Workspace.WindowOverlay.prototype, '_init', function(windowClone, parentActor) {
        createdActors.push(this._text = new St.Label({ style_class: 'extension-keyboardNavigator-window-tooltip',
                                                       text: TOOLTIP_CHARACTER }));
        this._text.hide();
        parentActor.add_actor(this._text);
    });

    winInjections['updatePositions'] = injectToFunction(Workspace.WindowOverlay.prototype, 'updatePositions', function(cloneX, cloneY, cloneWidth, cloneHeight) {
        let textX = cloneX - 2;
        let textY = cloneY - 2;
        this._text.set_position(Math.floor(textX) + 5, Math.floor(textY) + 5);
        this._text.raise_top();
    });

    Workspace.WindowOverlay.prototype.showTooltip = function() {
        this._text.raise_top();
        this._text.show();
    }
    winInjections['showTooltip'] = undefined;

    Workspace.WindowOverlay.prototype.hideTooltip = function() {
        if (this._text && this._text.visible)
            this._text.hide();
    }
    winInjections['hideTooltip'] = undefined;


    // Workspace injections
    //
    workspaceInjections['_init'] = injectToFunction(Workspace.Workspace.prototype, '_init', function() {
        this._keyboardTTid = undefined;
    });

    Workspace.Workspace.prototype.showWindowsTooltips = function() {
        for (let i in this._windowOverlays) {
            if (this._windowOverlays[i] != null)
                this._windowOverlays[i].showTooltip();
        }
    }
    workspaceInjections['showWindowsTooltips'] = undefined;

    Workspace.Workspace.prototype.hideWindowsTooltips = function() {
        for (let i in this._windowOverlays) {
            if (this._windowOverlays[i] != null)
                this._windowOverlays[i].hideTooltip();
        }
    }
    workspaceInjections['hideWindowsTooltips'] = undefined;


    // WorkspaceView Injections
    //
    workViewInjections['_init'] = injectToFunction(WorkspacesView.WorkspacesView.prototype, '_init', function(width, height, x, y, workspaces) {
        this._keyReleaseEventId = global.stage.connect('key-release-event', Lang.bind(this, this._onKeyRelease));
        connectedSignals.push({ obj: global.stage, id: this._keyReleaseEventId });
    });

    workViewInjections['_onDestroy'] = injectToFunction(WorkspacesView.WorkspacesView.prototype, '_onDestroy', function() {
        global.stage.disconnect(this._keyReleaseEventId);
        connectedSignals = [ ];
    });
    
    WorkspacesView.WorkspacesView.prototype._onKeyRelease = function(s, o) {

        if ( (o.get_key_symbol() == Clutter.KEY_Left) ||
             (o.get_key_symbol() == Clutter.KEY_Right) ) {
        
            let ws = this._workspaces[global.screen.get_active_workspace_index()];
            ws.hideWindowsTooltips();
            
            if ( ws._windowOverlays.length == 0 ) {
                ws._keyboardTTid = undefined;
                return false;
            }

            let c = 0;
            if (o.get_key_symbol() == Clutter.KEY_Left)
                c = -1;
            if (o.get_key_symbol() == Clutter.KEY_Right)
                c = 1;
            
            // 1+ window Overlays!            
            if ( ws._keyboardTTid === undefined ) {
                ws._keyboardTTid = 0;
            } else {
                ws._keyboardTTid += c;
                if ( ws._keyboardTTid >= ws._windowOverlays.length )
                    ws._keyboardTTid = 0;
                if ( ws._keyboardTTid < 0 )
                    ws._keyboardTTid = ws._windowOverlays.length - 1 ;
            }
            
            ws._windowOverlays[ws._keyboardTTid].showTooltip();
            return true;

        } 

        if ( (o.get_key_symbol() == 65293) ) {
            
            let ws = this._workspaces[global.screen.get_active_workspace_index()];
            ws.hideWindowsTooltips();
          
            if ( (ws._keyboardTTid !== undefined) &&
                 (ws._keyboardTTid < ws._windowOverlays.length) ) {
                let win = ws._windowOverlays[ws._keyboardTTid]._windowClone.metaWindow;
                Main.activateWindow(win, global.get_current_time());
            }
            return true;
        }

        return false;
    }
    workViewInjections['_onKeyRelease'] = undefined;

}


