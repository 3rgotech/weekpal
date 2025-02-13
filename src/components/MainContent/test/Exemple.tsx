import React, { useState } from 'react';
import { DndContext } from '@dnd-kit/core'; // Importation du contexte DnD Kit pour gérer le drag-and-drop
import DraggableTask from './Draggable'; // Importation du composant Draggable (élément déplaçable)
import Droppable from './Droppable'; // Importation du composant Droppable (zone de dépôt)

// Définition du composant Example qui gère le drag-and-drop
function Example() {
    // State pour suivre où se trouve l'élément draggable (null = pas encore déposé)
    const [parent, setParent] = useState(null);

    // Élément draggable défini une seule fois pour éviter de le recréer à chaque rendu
    const draggable = (
        <DraggableTask key={""} task={""} dayNumber={""} />
    );

    return (
        // DndContext est le contexte global qui gère l'ensemble du drag-and-drop
        <DndContext onDragEnd={handleDragEnd}>
            {/* Affichage du draggable uniquement si l'élément n'a pas encore été déposé */}
            {!parent ? draggable : null}

            {/* Zone de dépôt (Droppable) */}
            <Droppable id="1">
                {/* Si l'élément a été déposé ici, il s'affiche, sinon, affiche "Drop here" */}
                {parent === "1" ? draggable : 'Drop here'}
            </Droppable>
            <Droppable id="2">
                {/* Si l'élément a été déposé ici, il s'affiche, sinon, affiche "Drop here" */}
                {parent === "2" ? draggable : 'Drop here'}
            </Droppable>
            <Droppable id="3">
                {/* Si l'élément a été déposé ici, il s'affiche, sinon, affiche "Drop here" */}
                {parent === "3" ? draggable : 'Drop here'}
            </Droppable>
            <Droppable id="4">
                {/* Si l'élément a été déposé ici, il s'affiche, sinon, affiche "Drop here" */}
                {parent === "4" ? draggable : 'Drop here'}
            </Droppable>

        </DndContext>
    );

    // Fonction appelée à la fin du drag pour gérer le déplacement de l'élément
    function handleDragEnd({ over }) {
        // Vérifie si l'élément a été déposé dans une zone valide et met à jour son parent
        setParent(over ? over.id : null);
        console.log("Element dropped over: " + over?.id);
    }
}

export default Example; // Exportation du composant pour être utilisé ailleurs
