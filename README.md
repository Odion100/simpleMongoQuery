# simpleMongoQuery

## Introduction

The `simpleMongoQuery` package simplifies the process of constructing complex MongoDB queries through an intuitive notation system. It allows developers to create sophisticated queries using a straightforward object-and-string-based approach.

## Installation

To install `simpleMongoQuery`, use npm:

`npm install simple-mongo-query`

## Query Notation

The `simpleMongoQuery` package interprets a specific query notation within the input object to construct MongoDB queries. Below is a table summarizing the supported string notations:

| Notation                | Description                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `>`, `<`, `=` `<=` `>=` | Comparison operators indicating greater than, less than, or equal to.                                           |
| `:`                     | Range notation indicating inclusive range comparison. Example:`>0:<10` `>=0:<=10`.                              |
| `=`                     | Converts the value to a number. Example:`=5`                                                                    |
| `!=`                    | Not equal operator.                                                                                             |
| `=undefined`            | Checks if the field does not exist or is undefined.                                                             |
| `!=undefined`           | Checks if the field exists.                                                                                     |
| `&&`                    | Logical AND operator, used for conjunction of conditions for the same property.                                 |
| `\|\|`                  | Logical OR operator, used for disjunction of conditions for the same property.                                  |
| `[...]`                 | Square brackets denote inclusion; used with a comma-separated list for `$in`.                                   |
| `![...]`                | Square brackets preceded by exclamation; exclusion for `$nin`.                                                  |
| `rx=`                   | Prefix for regular expressions.                                                                                 |
| `fieldName:`            | Used with `&&` or `\|\|` operators to specify conditions in one field for a another field in the query.         |
| `customFunction(...)`   | Allows the use of custom-defined function notations within queries. Each function should return a MongoDB query |

### Example Usage

The `simpleMongoQuery` gives you the option to create a custom string-function notation. Define your custom function notation as methods on an object and pass it into the simpleMongoQuery function to return a query interpreter.

```javascript
const simpleMongoQuery = require("simple-mongo-query");

const customFunctions = {
  coord: (lon, lat, type = "Point", dist = 10000) => {
    const longitude = parseFloat(lon);
    const latitude = parseFloat(lat);
    const distance = parseFloat(dist);
    return {
      $near: {
        $geometry: { type, coordinates: [longitude, latitude] },
        $maxDistance: distance,
      },
    };
  },
};
const interpreter = simpleMongoQuery(customFunctions);

const query = interpreter({
  age: "|| >16:<25 && !=20",
  team1Score: "|| >50",
  team2Score: "|| >50",
  location: "[Brooklyn, Queens, Bronx]",
  status: "|| [ready, callout] && age: !=undefined",
  level: ">5",
  coordinates: "coord(-73.9707, 40.6625)",
});

console.log(query);
```

#### Results:

```javascript
{
    "location": {
        "$in": [
            "Brooklyn",
            "Queens",
            "Bronx"
        ]
    },
    "level": {
        "$gt": 5
    },
    "coordinates": {
        "$near": {
            "$geometry": {
                "type": "Point",
                "coordinates": [
                    -73.9707,
                    40.6625
                ]
            },
            "$maxDistance": 10000
        }
    },
    "$or": [
        {
            "$and": [
                {
                    "age": {
                        "$gt": 16,
                        "$lt": 25
                    }
                },
                {
                    "age": {
                        "$ne": 20
                    }
                }
            ]
        },
        {
            "team1Score": {
                "$gt": 50
            }
        },
        {
            "team2Score": {
                "$gt": 50
            }
        },
        {
            "$and": [
                {
                    "status": {
                        "$in": [
                            "ready",
                            "callout"
                        ]
                    }
                },
                {
                    "age": {
                        "$exists": true
                    }
                }
            ]
        }
    ]
}
```

### Notation Usage: `||` vs `&&` at the Start of a String

In `simpleMongoQuery`, logic operators are evaluated across properties by default (unless they are nested), so the placement of `||` and `&&` at the start of a string within a property's value plays a significant role.

- **`||` at the Start**: Indicates that conditions for a property are connected to other properties. If only one condition behind an `||` operator for all those properties returns true the document will be returned.

- **`&&` at the Start**: Implies that conditions for a property should be evaluated independently. All conditions behind an `&&` must be true to get the document.

Understanding this distinction helps in expressing complex conditions across multiple properties. This notation offers a way to structure queries with different logical relationships between conditions for various fields.
