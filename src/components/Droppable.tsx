import React from "react";
import { useDroppable } from "@dnd-kit/core"; // Importation du hook useDroppable depuis la bibliothèque @dnd-kit/core

// Définition du composant Droppable qui permet de créer une zone de dépôt pour le glisser-déposer
export function Droppable(props) {
  // Utilisation du hook useDroppable pour rendre cet élément réactif au drag-and-drop
  const { isOver, setNodeRef } = useDroppable({
    id: props.id, // Chaque zone de dépôt a un identifiant unique
  });

  // Définition du style : si un élément est au-dessus, l'opacité est à 1, sinon elle est réduite à 0.5
  const style = {
    opacity: isOver ? 1 : 0.5,
  };

  return (
    // Définition de la zone de dépôt avec une référence pour que DnD Kit puisse la détecter
    <div ref={setNodeRef} style={style}>
      {props.children}{" "}
      {/* Affiche les éléments enfants à l'intérieur de la zone de dépôt */}
    </div>
  );
}

export default Droppable; // Exportation du composant pour être utilisé ailleurs dans l'application
