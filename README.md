# Players Upload Pictures

Description TODO
--------------------------------------------------------------
This module adds an additional NPC sheet which can be used for loot containers such as chests. It also allows spells to be automatically converted into spell scrolls by dragging them onto this sheet. 

This version was forked from Jan Ole Peek's module which doesn't support pf1 system (https://github.com/jopeek/fvtt-loot-sheet-npc-5e). 
This fork will be maintained separately and specifically for Pathfinder 1 (may support PF2 in the future)

<p style="color:red">Development in progress ...</p>

### Features

Allows for easy assembly of items and coins to be distributed to players.

More features detailed below.

#### Features for GM

##### Loot Sheet

* Prepare a loot by dragging items from compendiums
* Alternatively, you can convert a dead PNJ into a loot by changing the sheet to `PF1.LootSheetPF1NPC`

![Demo Loot Sheet](doc/img/add-items-loot.gif)

##### Create Spell Scrolls

* Dragging of spells into the sheet will automatically turn them into scrolls.

![Demo crate scrolls](doc/img/scroll.gif)

##### Permissions & split money

* Permissions can be set in the sheet for each player and range from no access (cannot open sheet) to observer (view sheet and contents) to owner (view sheet and add/remove items).
* Any coins in the sheet can easily be split evenly across all players with owner access. The math and distribution is done for you via a single click if you're the GM. 

![Demo Permissions & Split](doc/img/split.gif)

#### Shopkeeper Sheet

* Can be used to create an inventory of a shopkeeper to allow players to peruse their inventory. Prices are listed next to each item.
* Use rolltables to automatically fill shopkeeper inventory

![Demo merchant](doc/img/merchant.gif)



#### Feature for PC

##### Loot items and money

* A PC with owner permissions can loot money and items from the sheet

![Demo Loot items and money](doc/img/loot.gif)

##### Buy/sell items at shopkeeper

* A PC can buy items from a shopkeeper
* A PC can sell items (half-price) to a shopkeeper

![Demo Buy and Sell items](doc/img/give.gif)

##### Give items to another PC

* A PC can give an item to another PC by dragging it on the actor

![Demo Give items](doc/img/give.gif)


### Compatibility:
- Tested with FVTT v0.6.0.

### Known Issues:
- Currently can't get back to original prices, especially if percentage is set to 0.
- If a player has the sheet open when the GM changes the loot type, the player gets an error from FoundryVTT and must reload. This happens only the first time the type is changed.
- When a player has 2 items and give 1 to somebody, the sheet doesn't get updated and still show (2).

### Installation Instructions

To install a module, follow these instructions:

1. Start FVTT and browse to the Game Modules tab in the Configuration and Setup menu
2. Select the Install Module button and enter the following URL: https://raw.githubusercontent.com/SvenWerlen/fvtt-loot-sheet-npc-pf1/master/module.json
3. Click Install and wait for installation to complete 

### Feedback

If you have any suggestions or feedback, please contact me on Discord (Dorgendubal#3348).
