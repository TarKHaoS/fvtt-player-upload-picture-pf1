//window.require=function(name) { throw "Dummy require function!!" };

import { ActorSheetPFNPC } from "../../systems/pf1/pf1.js";
import { LootSheetActions } from "./scripts/actions.js";

class UploadSheetPF extends ActorSheetPFNPC {

  static MODULENAME = "player-upload-pictures"
  static SOCKET = "module.player-upload-pictures";

  get template() {
    // adding the #equals and #unequals handlebars helper
    Handlebars.registerHelper('equals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('unequals', function(arg1, arg2, options) {
      return (arg1 != arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('lootsheetprice', function(basePrice, modifier) {
      return Math.round(basePrice * modifier * 100) / 100;
    });
    
    Handlebars.registerHelper('lootsheetweight', function(baseWeight, count) {
      return baseWeight * count;
    });
    
    Handlebars.registerHelper('lootsheetname', function(name, quantity, infinite) {
      if(infinite) return `(∞) ${name}`
      return quantity > 1 ? `(${quantity}) ${name}` : name;
    });

    const path = "systems/pf1/templates/actors/";
    return "modules/player-upload-pictures/template/npc-sheet.html";
  }

  static get defaultOptions() {
    const options = super.defaultOptions;

    mergeObject(options, {
      classes: ["pf1 sheet actor npc npc-sheet loot-sheet-npc"],
      width: 850,
      height: 750
    });
    return options;
  }

  async getData() {
    const sheetData = await super.getData();

    // Prepare GM Settings
    this._prepareGMSettings(sheetData.actor);
    //console.log(sheetData)

    // Prepare isGM attribute in sheet Data

    //console.log("game.user: ", game.user);
    if (game.user.isGM) sheetData.isGM = true;
    else sheetData.isGM = false;
    //console.log("sheetData.isGM: ", sheetData.isGM);
    //console.log(this.actor);

    let lootsheettype = await this.actor.getFlag(UploadSheetPF.MODULENAME, "lootsheettype");
    if (!lootsheettype) {
      lootsheettype = "Loot"
      await this.actor.setFlag(UploadSheetPF.MODULENAME, "lootsheettype", lootsheettype);
    }
    //console.log(`Loot Sheet | Loot sheet type = ${lootsheettype}`);

    let rolltable = await this.actor.getFlag(UploadSheetPF.MODULENAME, "rolltable");
    //console.log(`Loot Sheet | Rolltable = ${rolltable}`);

    
    let priceModifier = 1.0;
    if (lootsheettype === "Merchant") {
      priceModifier = await this.actor.getFlag(UploadSheetPF.MODULENAME, "priceModifier");
      if (!priceModifier) await this.actor.setFlag(UploadSheetPF.MODULENAME, "priceModifier", 1.0);
      priceModifier = await this.actor.getFlag(UploadSheetPF.MODULENAME, "priceModifier");
    }
    
    let totalItems = 0
    let totalWeight = 0
    let totalPrice = 0
    let maxCapacity = await this.actor.getFlag(UploadSheetPF.MODULENAME, "maxCapacity") || 0;
    let maxLoad = await this.actor.getFlag(UploadSheetPF.MODULENAME, "maxLoad") || 0;
    
    Object.keys(sheetData.actor.features).forEach( f => sheetData.actor.features[f].items.forEach( i => {  
      // specify if empty
      const itemQuantity = getProperty(i, "data.quantity") != null ? getProperty(i, "data.quantity") : 1;
      const itemCharges = getProperty(i, "data.uses.value") != null ? getProperty(i, "data.uses.value") : 1;
      i.empty = itemQuantity <= 0 || (i.isCharged && itemCharges <= 0);

      totalItems += itemQuantity
      totalWeight += itemQuantity * i.data.weightConverted
      totalPrice += itemQuantity * LootSheetActions.getItemCost(i)
    }));

    sheetData.lootsheettype = lootsheettype;
    sheetData.rolltable = rolltable;
    sheetData.priceModifier = priceModifier;
    sheetData.rolltables = game.tables.entities;
    sheetData.canAct = game.user.playerId in sheetData.actor.permission && sheetData.actor.permission[game.user.playerId] == 2;
    sheetData.totalItems = totalItems
    sheetData.maxItems = maxCapacity > 0 ? " / " + maxCapacity : ""
    sheetData.itemsWarning = maxCapacity <= 0 || maxCapacity >= totalItems ? "" : "warn"
    sheetData.totalWeight = Math.ceil(totalWeight)
    sheetData.maxWeight = maxLoad > 0 ? " / " + maxLoad : ""
    sheetData.weightWarning = maxLoad <= 0 || maxLoad >= totalWeight ? "" : "warn"
    sheetData.totalPrice = totalPrice
    sheetData.weightUnit = game.settings.get("pf1", "units") == "metric" ? game.i18n.localize("PF1.Kgs") : game.i18n.localize("PF1.Lbs")
    
    // Return data for rendering
    return sheetData;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  async activateListeners(html) {
    //console.log("Loot Sheet | activateListeners")
    super.activateListeners(html);
    
    const dragEnabled = await this.actor.getFlag(UploadSheetPF.MODULENAME, "dragEnabled");
    if(!dragEnabled) {    
      // Remove dragging capability
      let handler = ev => this._onDragItemStart(ev);
      html.find('li.item').each((i, li) => {
        if ( li.classList.contains("inventory-header") ) return;
        li.setAttribute("draggable", false);
        li.removeEventListener("dragstart", handler);
      });
    }
  }

  async _onDrop(event) {
    event.preventDefault();
    
    // Try to extract the data
    let data;
    let extraData = {};
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    // Item is from compendium
    if(!data.data) {
      if (game.user.isGM) { super._onDrop(event) }
      else {
        ui.notifications.error(game.i18n.localize("ERROR.lsInvalidDrop"));
      }
    }
    // Item from an actor
    else if (game.user.isGM) {
      console.log(event)
      console.log(data)
      console.log(await Item.fromDropData(data))
      let sourceActor = game.actors.get(data.actorId);
      let targetActor = this.token ? canvas.tokens.get(this.token.id).actor : this.actor;
      LootSheetActions.dropOrSellItem(game.user, targetActor, sourceActor, data.data._id)
    } 
    // users don't have the rights for the transaction => ask GM to do it
    else {
      let targetGm = null;
      game.users.forEach((u) => {
        if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
          targetGm = u;
        }
      });
      
      if(targetGm && data.actorId && data.data && data.data._id) {
        const packet = {
          type: "drop",
          userId: game.user._id,
          actorId: data.actorId,
          itemId: data.data._id,
          tokenId: this.token ? this.token.id : undefined,
          targetActorId: this.token ? undefined : this.actor.id,
          processorId: targetGm.id
        };
        game.socket.emit(UploadSheetPF.SOCKET, packet);
      }
    }
  }

}

/**
 * Register drop action on actor
 */
Hooks.on('renderActorDirectory', (app, html, data) => {
  
  function giveItemTo(actorDestId, event) {
    event.preventDefault();
    
    // try to extract the data
    let data;
    let extraData = {};
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }
    
    const giver = game.actors.get(data.actorId)
    const receiver = game.actors.get(actorDestId)
    const item = giver.getEmbeddedEntity("OwnedItem", data.data._id);
    
    // validate the type of item to be "moved" or "added"
    if(!["weapon","equipment","consumable","loot"].includes(item.type)) {
      ui.notifications.error(game.i18n.localize("ERROR.lsGiveInvalidType"));
      return false;
    }
    
    let targetGm = null;
    game.users.forEach((u) => {
      if (u.isGM && u.active && u.viewedScene === game.user.viewedScene) {
        targetGm = u;
      }
    });
    
    //if (data.actorId === actorDestId) {
    //  ui.notifications.error(game.i18n.localize("ERROR.lsWhyGivingToYourself"));
    //  console.log("Loot Sheet | Ignoring giving something to same person")
    //  return false;
    //}
    
    let options = {}
    if (data.actorId === actorDestId) {
      if(item.data.quantity == 1) {
        ui.notifications.error(game.i18n.localize("ERROR.lsWhyGivingToYourself"));
        console.log("Loot Sheet | Ignoring giving something to same person")
        return false;
      }
      options['title'] = game.i18n.localize("ls.giveTitleSplit");
      options['acceptLabel'] = game.i18n.localize("ls.split");
    } else if(item.data.quantity == 1) {
      options['title'] = game.i18n.localize("ls.give");
      options['label'] = game.i18n.format("ls.giveContentSingle", {item: item.name, actor: receiver.name });
      options['quantity'] = 1
      options['acceptLabel'] = game.i18n.localize("ls.give");
    } else {
      options['title'] = game.i18n.format("ls.giveTitle", {item: item.name, actor: receiver.name });
      options['label'] = game.i18n.localize("ls.giveContent");
      options['acceptLabel'] = game.i18n.localize("ls.give");
    }
    
    let d = new QuantityDialog((quantity) => {
    
      if( game.user.isGM ) {
        LootSheetActions.giveItem(game.user, data.actorId, actorDestId, data.data._id, quantity)
      } else {
        const packet = {
          type: "give",
          userId: game.user._id,
          actorId: data.actorId,
          itemId: data.data._id,
          targetActorId: actorDestId,
          processorId: targetGm.id,
          quantity: quantity
        };
        console.log(`Loot Sheet | Sending packet to ${actorDestId}`)
        game.socket.emit(UploadSheetPF.SOCKET, packet);
      }
    }, options);
    d.render(true);

  }
  
  html.find('li.actor').each((i, li) => {
    li.addEventListener("drop", giveItemTo.bind(this, li.getAttribute("data-entity-id")));
  });
});


Hooks.once("init", () => {

  loadTemplates([
    "modules/player-upload-pictures/template/npc-sheet-gmpart.html", 
    "modules/player-upload-pictures/template/dialog-price-modifier.html"]);
  
  Handlebars.registerHelper('ifeq', function(a, b, options) {
    if (a == b) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  game.settings.register(UploadSheetPF.MODULENAME, "changeScrollIcon", {
    name: game.i18n.localize("SETTINGS.lsChangeIconForSpellScrollsTitle"), 
    hint: game.i18n.localize("SETTINGS.lsChangeIconForSpellScrollsHint"), 
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register(UploadSheetPF.MODULENAME, "buyChat", {
    name: game.i18n.localize("SETTINGS.lsPurchaseChatMessageTitle"),
    hint: game.i18n.localize("SETTINGS.lsPurchaseChatMessageHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  game.settings.register(UploadSheetPF.MODULENAME, "clearInventory", {
    name: game.i18n.localize("SETTINGS.lsClearInventoryTitle"),
    hint: game.i18n.localize("SETTINGS.lsClearInventoryHint"),
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  });

  game.settings.register(UploadSheetPF.MODULENAME, "removeEmptyStacks", {
    name: game.i18n.localize("SETTINGS.lsRemoveEmptyStackTitle"),
    hint: game.i18n.localize("SETTINGS.lsRemoveEmptyStackHint"),
    scope: "world",
    config: true,
    default: true,
    type: Boolean
  });

  /*******************************************
   *          SOCKET HANDLING!
   *******************************************/
  game.socket.on(UploadSheetPF.SOCKET, data => {
    console.log("Loot Sheet | Socket Message: ", data);
    if (game.user.isGM && data.processorId === game.user.id) {
      let user = game.users.get(data.userId);
      let sourceActor = game.actors.get(data.actorId);
      let targetActor = data.tokenId ? canvas.tokens.get(data.tokenId).actor : game.actors.get(data.targetActorId);
        
      if (data.type === "buy") {
        if (sourceActor && targetActor) {
          LootSheetActions.transaction(user, targetActor, sourceActor, data.itemId, data.quantity);
        } else if (!targetActor) {
          LootSheetActions.errorMessageToActor(sourceActor, game.i18n.localize("ERROR.lsNoActiveGM"))
          ui.notifications.error(game.i18n.localize("ERROR.lsPurchaseAttempt"));
        }
      }

      else if (data.type === "loot") {
        if (sourceActor && targetActor) {
          LootSheetActions.lootItem(user, targetActor, sourceActor, data.itemId, data.quantity);
        } else if (!targetActor) {
          LootSheetActions.errorMessageToActor(sourceActor, game.i18n.localize("ERROR.lsNoActiveGM"))
          ui.notifications.error(game.i18n.localize("ERROR.lsLootAttempt"));
        }
      }
      
      else if (data.type === "drop") {
        if(sourceActor && targetActor) {
          LootSheetActions.dropOrSellItem(user, targetActor, sourceActor, data.itemId)
        }
      }
      
      else if (data.type === "give") {
        LootSheetActions.giveItem(user, data.actorId, data.targetActorId, data.itemId, data.quantity);
      }
    }
    if (data.type === "error" && data.targetId === game.user.actorId) {
      console.log("Loot Sheet | Transaction Error: ", data.message);
      return ui.notifications.error(data.message);
    }
  });

  //Register the loot sheet
  Actors.registerSheet("PF1", UploadSheetPF, {
    types: ["npc"],
    makeDefault: false
  });

});


Hooks.on("getActorDirectoryEntryContext", (html, options) => {
  options.push({
    name: game.i18n.localize("ls.convertToLoot"),
    icon: '<i class="fas fa-skull-crossbones"></i>',
    callback: async function(li) {
      const actor = game.actors.get(li.data("entityId"))
      if(actor) { 
        await actor.setFlag("core", "sheetClass", "PF1.UploadSheetPF");
        let permissions = duplicate(actor.data.permission)
        game.users.forEach((u) => {
          if (!u.isGM) { permissions[u.id] = 2 }
        });
        await actor.update( { permission: permissions }, {diff: false});
      }
    },
    condition: li => {
      const actor = game.actors.get(li.data("entityId"))
      return /*game.user.isGM && */actor && actor.data.type === "character" /*&& !(actor.sheet instanceof UploadSheetPF) */&& actor.data.token.actorLink;
    },
  });
});
