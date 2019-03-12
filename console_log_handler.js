const loglevels = {
    info: 'info',
    debug: 'debug',
    error: 'error',
    log: 'log'
};

module.exports.loglevels = loglevels;

/*

let season = loglevels.error;

if(!season){
    throw new Error('Season is not defined')
}


*/

module.exports.log_message = function (loglevel,message) {
    try{
        switch(loglevel){
            case loglevels.info:
                console.info("\x1b[37m",message); //FgWhite
                break;
            case loglevels.debug:
                console.debug("\x1b[33m",message); //FgYellow
                break;
            case loglevels.error:
                console.error("\x1b[31m",message); //FgRed
                break;
            case loglevels.log:
                console.log("\x1b[36m",message); //FgCyan
                break;
        }
    }catch (ex){
        console.error(ex);
    }
};