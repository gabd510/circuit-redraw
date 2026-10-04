# Circuit Redraw

## Használati útmutató / Instructions for use

**Magyar leírás**  
*English version below.*

A Circuit Redraw egy böngészőben futó, egyszerű eszköz ellenállásos kapcsolási rajzok vizuális átrajzolására és rendezésére. A program célja a kapcsolások áttekinthetőbb elrendezése a kapcsolatok megtartása mellett. Elektromos számításokat vagy áramkör-analízist nem végez.

**Online verzió:** https://gabd510.github.io/circuit-redraw/

---

## Magyar

### Mozgatás

A **Mozgatás** eszköz a már létrehozott elemek kijelölésére és átrendezésére használható.

A kijelölt elem kékkel jelenik meg, a hozzá tartozó lehetőségek pedig a jobb oldali **Tulajdonságok** panelen érhetők el.

- **Csomópont:** kattintással kijelölhető, húzással mozgatható. A hozzá kapcsolódó vezetékek automatikusan követik. Ha egy csomópontot pontosan egy másik csomópontra húzol, a kettő összeolvad, és a kapcsolatok megmaradnak.
- **Ellenállás:** kattintással kijelölhető és húzással mozgatható. A Tulajdonságok panelen módosítható a neve és a megjelenített értéke, 90°-kal forgatható, illetve törölhető.
- **Vezeték:** kattintással kijelölhető. A kijelölt vezeték két végén fogantyúk jelennek meg. Ezek segítségével a vezeték vége áthúzható másik csomópontra vagy ellenállás-terminálra. Ha nem érvényes csatlakozási ponton engeded el, visszaugrik az eredeti helyére.
- **Vezetéktöréspont:** egy vezetékre duplán kattintva új töréspont hozható létre. A töréspont húzással mozgatható. Kijelölés után a Tulajdonságok panelen törölhető.

### Csomópont

Válaszd a **Csomópont** eszközt, majd kattints egy üres helyre a rajzterületen.

A csomópontok automatikusan `A`, `B`, `C`… nevet kapnak. A név később a Tulajdonságok panelen módosítható.

Ha közvetlenül egy meglévő vezetékre kattintasz, az új csomópont automatikusan bekerül a vezetékbe. Az eredeti vezeték két részre bomlik, miközben a kapcsolat megmarad.

### Ellenállás

Válaszd az **Ellenállás** eszközt, majd kattints egy üres helyre a rajzterületen.

Az ellenállások automatikusan `R1`, `R2`, `R3`… nevet kapnak.

Mozgatás módban kijelölve a jobb oldali Tulajdonságok panelen:
- módosítható a neve;
- módosítható a megjelenített ellenállásérték;
- 90°-kal elforgatható;
- törölhető.

Ha az ellenállást közvetlenül egy meglévő vezetékre helyezed, a program automatikusan beilleszti a vezetékbe és létrehozza a szükséges két kapcsolatot.

Vízszintes vezetékszakaszon az ellenállás vízszintesen, függőleges szakaszon függőlegesen kerül elhelyezésre.

### Vezeték

Válaszd a **Vezeték** eszközt.

Új vezeték létrehozásához kattints az első csatlakozási pontra, majd a másodikra.

A vezeték az alábbiak között hozhat létre kapcsolatot:
- csomópont → csomópont;
- csomópont → ellenállás-terminál;
- ellenállás-terminál → ellenállás-terminál.

A már elkészült vezeték szerkesztéséhez válts vissza **Mozgatás** módba.

### Rács

A csomópontok, ellenállások és vezetéktöréspontok automatikusan a háttér **20 pixeles rácsához** igazodnak. Ez segít az áramkör rendezett elhelyezésében.

### Súgó

A program jobb felső részén található **Súgó** gombbal az alkalmazás elhagyása nélkül megnyitható a használati útmutató. A súgó magyar és angol nyelven is elérhető.

---

# English

Circuit Redraw is a simple browser-based tool for visually redrawing and rearranging resistor circuit diagrams. Its purpose is to make circuit layouts clearer while preserving their connections. It does not perform electrical calculations or circuit analysis.

**Online version:** https://gabd510.github.io/circuit-redraw/

## Move

Use **Move** to select and rearrange existing elements.

The selected element is highlighted in blue and its available settings appear in the **Properties** panel on the right.

- **Node:** click to select and drag to move. Connected wires follow automatically. Dragging a node directly onto another node merges them while preserving the connections.
- **Resistor:** click to select and drag to move. Its name and displayed resistance value can be changed in the Properties panel. It can also be rotated by 90° or deleted.
- **Wire:** click to select. Handles appear at both endpoints. Drag an endpoint handle onto another node or resistor terminal to reconnect the wire. If released without a valid connection, it returns to its original position.
- **Wire bend point:** double-click a wire to create a bend point. Bend points can be dragged and can be deleted from the Properties panel when selected.

## Node

Select **Node** and click an empty position on the canvas.

Nodes are automatically named `A`, `B`, `C`… and can be renamed later in the Properties panel.

Clicking directly on an existing wire inserts the new node into the wire. The original wire is automatically split into two sections while preserving the connection.

## Resistor

Select **Resistor** and click an empty position on the canvas.

Resistors are automatically named `R1`, `R2`, `R3`….

When selected in Move mode, the Properties panel allows you to:
- change its name;
- change its displayed resistance value;
- rotate it by 90°;
- delete it.

Placing a resistor directly on an existing wire automatically inserts it into the connection and creates the two required wire connections.

The resistor is placed horizontally on a horizontal wire segment and vertically on a vertical wire segment.

## Wire

Select **Wire**.

To create a new wire, click the first connection point and then the second.

A wire can connect:
- node → node;
- node → resistor terminal;
- resistor terminal → resistor terminal.

To edit an existing wire, switch back to **Move** mode.

## Grid

Nodes, resistors, and wire bend points automatically snap to the **20-pixel background grid**, helping keep the circuit layout organized.

## Help

Use the **Súgó / Help** button in the upper-right area of the application to open the instructions without leaving the editor. The help window is available in both Hungarian and English.
