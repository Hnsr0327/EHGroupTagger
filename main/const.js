// const.js
const CONSTS = {
    LOG_LEVELS: {ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4},
    TEST_LEVEL: 3,                        // 输出 Console Log 等级
    TOTAL_GALLERIES: 1350000,             // 总画廊数
    LOG_INTERVAL: 60000,                  // 输出 Info Log 间隔
    HARD_MINIMUM_DELAY: 30000,             // delay 函数的硬下限
    FIX_START: 9999999,                   // 固定初始
    FIX_ORIGIN_MODE: 0,                   // 固定初始模式
    PATHFINDER_MAX_PAGE: 7,               // 每次 pathFinder 函数的循环上限
    DELAY_BETWEEN_PAGES: 30000,            // 每次 pathFinder 两次翻页操作之间的等待时间（毫秒）
    QUEUE_CONCURRENT_TASKS: 1,            // 任务队列的并发任务数量
    ENABLE_EX_CRAWL: 0,                   // 0 = E-Hentai, 1 = YOU-KNOW-WHICH
    PROXY_MODE: 0,                        // 0 = No Proxy, 1 = Proxy
    TASK_STAGE: {                         // 任务分发阶段
        pathfinder: true,
        rewinder: false,
        crawler: false,
    },
};
CONSTS.RESOLVE_INTERVAL = 10000;            // 在主函数执行后等待的时间间隔（毫秒）
CONSTS.PASSWORD = "eagvoifdbnmajoer";       // test password not to cloud it's nonsense

module.exports = CONSTS;

