const { startAgent } = require('./core/agent');

startAgent().catch(err => {
    console.error("Agent crashed:", err);
});
