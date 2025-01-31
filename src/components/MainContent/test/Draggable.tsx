import React from 'react';
import { useDraggable } from '@dnd-kit/core'; // Importation du hook useDraggable pour rendre un élément draggable
import { CSS } from '@dnd-kit/utilities'; // Importation de CSS utilities pour gérer les transformations

// Définition du composant Draggable qui rend un élément déplaçable
function Draggable(props) {
    // Utilisation du hook useDraggable pour gérer le comportement du drag-and-drop
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: props.id, // Chaque élément draggable doit avoir un identifiant unique
    });

    // Définition du style CSS, permettant de déplacer l'élément en fonction de la transformation
    const style = {
        // Convertit la transformation en une chaîne CSS du type `translate3d(x, y, 0)`
        transform: CSS.Translate.toString(transform),
    };

    return (
        // Le bouton représente l'élément draggable
        <button
            ref={setNodeRef} // Référence nécessaire pour que DnD Kit détecte cet élément comme draggable
            style={style} // Application du style dynamique en fonction du déplacement
            {...listeners} // Ajoute les événements nécessaires pour le drag (ex: onMouseDown, onTouchStart)
            {...attributes} // Fournit des attributs d'accessibilité pour le drag-and-drop
        >
            {props.children} {/* Affiche le contenu enfant à l'intérieur du bouton */}
        </button>
    );
}

export default Draggable; // Exportation du composant pour être utilisé ailleurs dans l'application
