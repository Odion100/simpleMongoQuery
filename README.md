# simpleMongoQuery

## Introduction

The `simpleMongoQuery` package simplifies the process of constructing complex MongoDB queries through an intuitive notation system. It allows developers to create sophisticated queries using a straightforward object-and-string-based approach.

## Installation

To install `simpleMongoQuery`, use npm:

npm install simpleMongoQuery

## Query Notation

The `simpleMongoQuery` package interprets a specific query notation within the input object to construct MongoDB queries. Below is a table summarizing the supported string notations:

| Notation                | Description                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| `>`, `<`, `=` `<=` `>=` | Comparison operators indicating greater than, less than, or equal to.            |
| `:`                     | Range notation indicating inclusive range comparison example`>0:<10` `>=0:<=10`. |
| `!=`                    | Not equal to operator.                                                           |
| `&&`                    | Logical AND operator, used for conjunction of conditions for the same property.  |
| `\|\|`                  | Logical OR operator, used for disjunction of conditions for the same property.   |
| `[...]`                 | Square brackets denote inclusion; used with a comma-separated list for `$in`.    |
| `![...]`                | Square brackets preceded by exclamation; exclusion for `$nin`.                   |
| `rx=`                   | Prefix for regular expressions.                                                  |

### Example Usage

The `simpleMongoQuery` function is used to illustrate the notation:

```javascript
simpleMongoQuery({
  age: "|| >16:<25 && !=20",
  team1Score: "|| >50",
  team2Score: "|| >50",
  location: "[Brooklyn, Queens, Bronx]",
  status: "[ready, callout]",
  level: ">5",
});
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
    "status": {
        "$in": [
            "ready",
            "callout"
        ]
    },
    "level": {
        "$gt": 5
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
        }
    ]
}
```

### Notation Usage: `||` vs `&&` at the Start of a String

In `simpleMongoQuery`, logic operators are evaluated across properties by default (unless they are nested), so the placement of `||` and `&&` at the start of a string within a property's value plays a significant role.

- **`||` at the Start**: Indicates that conditions for a property are connected to other properties. If only one condition behind an `||` operator for all those properties returns true the document will be returned.

- **`&&` at the Start**: Implies that conditions for a property should be evaluated independently. All conditions behind an `&&` must be true to get the document. In truth `&&` at the start is only need when nesting or conditions while still requiring a match independently on that field. This is because
  every property on a mongo query is already implicitly evaluated as logical and clauses.

Understanding this distinction helps in expressing complex conditions across multiple properties. This notation offers a way to structure queries with different logical relationships between conditions for various fields.
