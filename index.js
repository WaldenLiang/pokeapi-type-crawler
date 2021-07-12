const Crawler = require('crawler')
const cheerio = require('cheerio')
const fs = require('fs')

const templates = {
  interface: 'export interface {interface_name} {\n  {properties}\n}',
  property: '  /**\n   * {property_desc}   */\n  {property_name}: {property_type};'
}

const c = new Crawler({
  maxConnections: 10
})

c.queue([{
  uri: 'https://pokeapi.co/docs/v2',
  callback: (error, res, done) => {
    if (error) {
      console.error(error)
    } else {
      const $ = cheerio.load(res.body)
      const interfaceArray = []
      $('table').each(function () {
        const table = $(this)
        const interfaceName = table.prev().text().replace(/\(type\)/, '').trim()
        let interfaceTemp = templates.interface.replace('\{interface_name\}', interfaceName)

        const tbody = table.find('tbody')
        const propertiesArray = []
        tbody.find('tr').each(function () {
          const tr = $(this)
          let propertyTemp = templates.property
          tr.find('td').each(function (i) {
            const td = $(this)
            if (i === 0) {
              propertyTemp = propertyTemp.replace('\{property_name\}', td.text())
            } else if (i === 1) {
              propertyTemp = propertyTemp.replace('\{property_desc\}', td.text())
            } else if (i === 2) {
              propertyTemp = propertyTemp.replace('\{property_type\}', propertyTypeConverter(td.text()))
            }
          })
          propertiesArray.push(propertyTemp)
        })
        interfaceTemp = interfaceTemp.replace('\{properties\}', propertiesArray.join('\n'))
        interfaceArray.push(interfaceTemp)
      })

      fs.writeFileSync('./pokeapi-v2.interface.ts', interfaceArray.join('\n\n'), 'utf8')
    }
    done()
  }
}])

function propertyTypeConverter (typeString) {
  if (typeString === 'string') {
    return 'string'
  } else if (typeString === 'integer') {
    return 'number'
  } else if (typeString === 'boolean') {
    return 'boolean'
  } else {
    const temp = typeString.replace(/\([0-9a-zA-Z\-_$]+\)/, '').trim()
    if (temp.startsWith('list ')) {
      return `${propertyTypeConverter(temp.split(' ')[1])}[]`
    }
    return temp
  }
}
