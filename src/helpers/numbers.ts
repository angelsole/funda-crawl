export const priceToInt = (price: string) => {
  const formatedPrice = price.replace(/€|k\.k\.|\s/g, '')
  const withoutCommas = formatedPrice.replace(/,/g, '')
  const priceNumber = parseInt(withoutCommas, 10)
  return priceNumber
}

export const getBathroomsAndToilets = (bathrooms: string) => {
  const [bathroomsNumber, toiletsNumber] = bathrooms.split(' and ').map((number) => parseInt(number, 10))
  return { bathrooms: bathroomsNumber, toilets: toiletsNumber }
}
