// For more information, see https://crawlee.dev/
import { Actor } from 'apify'
import { PlaywrightCrawler, Dataset } from 'crawlee'
import { formatAnnouncementDate } from './helpers/dates.js'
import { getBathroomsAndToilets, priceToInt } from './helpers/numbers.js'

await Actor.main(async () => {
  // PlaywrightCrawler crawls the web using a headless
  // browser controlled by the Playwright library.
  const crawler = new PlaywrightCrawler({
    // Use the requestHandler to process each of the crawled pages.
    async requestHandler({ request, page, enqueueLinks, log }) {
      const title = await page.title()
      log.info(`Title of ${request.loadedUrl} is '${title}'`)

      if (request.loadedUrl?.includes('/p') || request.loadedUrl?.includes('#')) {
        await enqueueLinks({
          strategy: 'same-domain',
          selector: 'a',
          globs: ['http?(s)://www.funda.nl/en/koop/*/huis-*/[?]**'],
        })
        return
      }

      const { street, postcode, neighborhood } = await page.$$eval('h1 span', (elements: any) => {
        const [postcode, neighborhood] = elements[1].textContent.split(/\r?\n|\r|\n/g)
        return {
          street: elements[0].textContent,
          postcode,
          neighborhood: neighborhood.trim(),
        }
      })

      const { livingArea, plotSize, bedrooms } = await page.$$eval(
        '[data-test-kenmerken-highlighted-value]',
        (elements: any) => {
          const [livingArea, plotSize, bedrooms] = elements.map((element: any) => element.textContent)
          const livingToInt = parseInt(livingArea.replace(' m²', ''), 10)
          const plotToInt = parseInt(plotSize.replace(' m²', ''), 10)
          const bedroomsToInt = parseInt(bedrooms, 10)
          return {
            livingArea: livingToInt,
            plotSize: plotToInt,
            bedrooms: bedroomsToInt,
          }
        }
      )

      const price = await page.$eval('.object-header__price', (element: any) => element.textContent)
      const priceNumber = priceToInt(price)

      const description = await page.$eval('[data-object-description-body]', (element: any) => element.textContent)
      const announcementDate = await page.$eval(
        'text=Listed since',
        (element: any) => element.nextElementSibling.textContent
      )
      const formatedAnouncementDate = formatAnnouncementDate(announcementDate)

      const bathroomsAndToilets = await page.$eval(
        'text=Number of bath rooms',
        (element: any) => element.nextElementSibling.textContent
      )
      const { bathrooms, toilets } = getBathroomsAndToilets(bathroomsAndToilets)

      // Get elements with Text 'Year of construction' or 'Construction period'
      const yearOfConstruction = await page.$$eval('text=Year of construction', (elements: any) => {
        if (elements.length === 0) {
          return null
        }
        return elements[0].nextElementSibling.textContent
      })
      const constructionPeriod = await page.$$eval('text=Construction period', (elements: any) => {
        if (elements.length === 0) {
          return null
        }
        return elements[0].nextElementSibling.textContent
      })
      const constructionPeriodEndYear = constructionPeriod && constructionPeriod.split(' - ')[1]

      const constructionYearText = yearOfConstruction || constructionPeriodEndYear

      const constructionYear = constructionYearText && new Date(constructionYearText).getFullYear()

      await page.goto(`${request.loadedUrl}/#foto-1`)
      const images = await page.$$eval('[data-media-id]', (elements: any) => {
        const routes = elements.map((element: any) => element.dataset.lazy)
        const routesClean = routes.filter((route: any) => route)
        return routesClean
      })

      // Save results as JSON to ./storage/datasets/default
      await Dataset.pushData({
        announcementDate: formatedAnouncementDate,
        bathrooms,
        bedrooms,
        constructionYear,
        description,
        livingArea,
        neighborhood,
        plotSize,
        postcode,
        price: priceNumber,
        street,
        title,
        toilets,
        url: request.loadedUrl,
        images,
      })

      // Extract links from the current page
      // and add them to the crawling queue.
      await enqueueLinks({
        strategy: 'same-domain',
        selector: 'a',
        globs: ['http?(s)://www.funda.nl/en/koop/*/huis-*/[?]**'],
      })
    },
    maxRequestsPerCrawl: process.env.MAX_REQUESTS_PER_CRAWL ? parseInt(process.env.MAX_REQUESTS_PER_CRAWL, 10) : 10,
    // Uncomment this option to see the browser window.
    // headless: false,
  })

  // Add first URL to the queue and start the crawl.
  await crawler.run([
    'https://www.funda.nl/en/koop/amsterdam/p1/',
    'https://www.funda.nl/en/koop/utrecht/p1/',
    'https://www.funda.nl/en/koop/amstelveen/p1/',
    'https://www.funda.nl/en/koop/haarlem/p1/',
  ])
})
