const esClient = require("../services/es");

exports.searchAll = async (req, res) => {
  const { search_query } = req.query;
  try {
    const [userResponse, groupResponse, postResponse, commentResponse] =
      await Promise.all([
        esClient.search({
          index: "users",
          body: {
            query: {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: search_query,
                      fields: ["username"], // Specify fields to search
                      fuzziness: "AUTO", // Enable fuzziness
                    },
                  },
                  {
                    prefix: {
                      username: search_query,
                    },
                  },
                ],
              },
            },
          },
        }),
        esClient.search({
          index: "groups",
          body: {
            query: {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: search_query,
                      fields: ["name", "description"], // Specify fields to search
                      fuzziness: "AUTO", // Enable fuzziness
                    },
                  },
                  {
                    prefix: {
                      name: search_query,
                    },
                  },
                ],
              },
            },
          },
        }),
        esClient.search({
          index: "posts",
          body: {
            query: {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: search_query,
                      fields: ["username", "title", "body", "city"],
                      fuzziness: "AUTO",
                    },
                  },
                  {
                    prefix: {
                      city: search_query,
                    },
                  },
                  {
                    prefix: {
                      title: search_query,
                    },
                  },
                ],
              },
            },
          },
        }),
        esClient.search({
          index: "comments",
          body: {
            query: {
              bool: {
                should: [
                  {
                    multi_match: {
                      query: search_query,
                      fields: ["text"],
                      fuzziness: "AUTO",
                    },
                  },
                  {
                    prefix: {
                      text: search_query,
                    },
                  },
                ],
              },
            },
          },
        }),
      ]);

    const results = {
      users: userResponse.hits.hits,
      posts: postResponse.hits.hits,
      comments: commentResponse.hits.hits,
      groups: groupResponse.hits.hits,
    };

    res.status(200).json(results);
  } catch (error) {
    console.log(error);
    res.status(404).send("Hello");
    res.status(500).send("Error searching data");
  }
};
