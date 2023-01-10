import {
    uniqueNamesGenerator,
    Config,
    adjectives,
    animals
  } from "unique-names-generator";


  export const randomName = () => {
   
      return uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: "-",
        length: 2,
        style: "lowerCase"
      });

  }