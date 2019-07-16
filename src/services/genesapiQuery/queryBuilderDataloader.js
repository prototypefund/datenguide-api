import _ from 'lodash'
import { GESAMT_VALUE } from '../graphql/schema'

const regionQuery = val => {
  return _.isArray(val)
    ? { terms: { region_id: val } }
    : { term: { region_id: val } }
}

const statisticsArgsQuery = (arg, values) => ({
  bool: {
    should: values.map(a => ({
      prefix: {
        cube: a.substr(1)
      }
    }))
  }
})

const valueArgsQuery = (arg, values) => {
  if (values.length === 1) {
    return [
      {
        term: {
          [arg]: values[0]
        }
      }
    ]
  }
  if (values.length > 1) {
    return [
      {
        terms: {
          [arg]: values
        }
      }
    ]
  }
  return []
}

const gesamtValueArgQuery = (arg, values) =>
  values.length > 0
    ? [
        {
          bool: {
            must_not: {
              exists: {
                field: arg
              }
            }
          }
        }
      ]
    : []

const valueAttributeQuery = (attribute, args) => [
  {
    exists: {
      field: attribute
    }
  },
  ...Object.keys(args).map(arg => {
    return arg === 'statistics'
      ? statisticsArgsQuery(arg, args[arg])
      : {
          bool: {
            should: [
              ...valueArgsQuery(
                arg,
                args[arg].filter(v => v !== GESAMT_VALUE)
              ),
              ...gesamtValueArgQuery(
                arg,
                args[arg].filter(v => v === GESAMT_VALUE)
              )
            ]
          }
        }
  })
]

const buildQuery = ({ index, params }) => {
  const { obj, attribute, args } = params
  return {
    index,
    size: 10,
    type: 'doc',
    scroll: '10s',
    body: {
      query: {
        constant_score: {
          filter: {
            bool: {
              must: [
                regionQuery(obj.id),
                ...valueAttributeQuery(attribute, args)
              ]
            }
          }
        }
      }
    }
  }
}

export default buildQuery
