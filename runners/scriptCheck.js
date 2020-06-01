const Logger = require('../lib/logger.js');
const logger = new Logger('OctoFarm-Scripts');
const serverCommands = require("../lib/serverCommands");
const Script = serverCommands.Script;
const Alerts = require("../models/Alerts.js")

class ScriptRunner{
    static async save(printer, trigger, message, scriptLocation){
            let alert = {
                active: true,
                trigger: trigger,
                message: message,
                scriptLocation: scriptLocation,
                printers: printer
            }
            let newAlert = await new Alerts(alert);
            logger.info("Saving: " + trigger + " " + scriptLocation + " " + message)
            newAlert.save().then(e=> {
                logger.info("Saved: " + trigger + " " + scriptLocation + " " + message)
            });
            return "saved"
    }
    static async edit(alertID, message, scriptLocation){

    }
    static async get(printer){
        if(printer){

        }else{

        }
    }
    static async check(printer, trigger){
        let currentAlerts = await Alerts.find({});
        for(let i = 0; i < currentAlerts.length; i++){
            if(currentAlerts[i].printer === printer._id || currentAlerts[i].printer.length === 0){
                if(currentAlerts[i].trigger === trigger && currentAlerts[i].active){
                    let newMessage = await ScriptRunner.convertMessage(printer, currentAlerts[i].message);
                    console.log("FIRE ONCE")
                    ScriptRunner.fire(currentAlerts[i].scriptLocation, newMessage);
                }
            }
        }
    }
    static async test(scriptLocation, message){
       logger.info("Testing: " + scriptLocation + " " + message)
       let fire = await Script.fire(scriptLocation, message)
       return fire;
    }
    static async fire(scriptLocation, message){
        logger.info("Testing: " + scriptLocation + " " + message)
        let fire = await Script.fire(scriptLocation, message)
        console.log(fire)
        return fire;
    }
    static async convertMessage(printer, message){
        let job = "";
        if (typeof printer.job != "undefined") {
            job = printer.job;
        } else {
            job = {
                file: {
                    name: "No File Selected",
                    display: "No File Selected",
                    path: "No File Selected"
                },
                estimatedPrintTime: 0,
                lastPrintTime: 0
            };
        }
        let progress = "";

        if (
            typeof printer.progress != "undefined" &&
            printer.progress.completion != null
        ) {
            progress = printer.progress;
        } else {
            progress = {
                completion: "No Percent Available",
                filepos: 0,
                printTime: "No Time Left",
                printTimeLeft: "No Time Left"
            };
        }


        if(message.includes("[ETA]")){
            let dateComplete = "No Active Print"
            if (typeof printer.progress !== "undefined" && printer.progress.printTimeLeft !== null) {
                let currentDate = new Date();
                currentDate = currentDate.getTime();
                let futureDateString = new Date(currentDate + printer.progress.printTimeLeft * 1000).toDateString()
                let futureTimeString = new Date(currentDate + printer.progress.printTimeLeft * 1000).toTimeString()
                futureTimeString = futureTimeString.substring(0, 8);
                dateComplete = futureDateString + ": " + futureTimeString;
            }
            message = message.replace(/\[ETA\]/g, dateComplete);
        }
        if(message.includes("[PrinterName]")){
            message = message.replace(/\[PrinterName\]/g, printer.settingsApperance.name);
        }
        if(message.includes("[PrinterURL]")){
            message = message.replace(/\[PrinterURL\]/g, printer.printerURL);
        }
        if(message.includes("[PrinterAPIKey]")){
            message = message.replace(/\[PrinterAPIKey\]/g, printer.apikey);
        }
        if(message.includes("[TimeRemaining]")){
            message = message.replace(/\[TimeRemaining\]/g, generateTime(progress.printTimeLeft));
        }
        if(message.includes("[EstimatedTime]")){
            message = message.replace(/\[EstimatedTime\]/g, generateTime(job.estimatedPrintTime));
        }
        if(message.includes("[CurrentZ]")){
            let current = ""
            if (
                typeof printer.currentZ === "undefined" ||
                current === null
            ) {
                current = "No Current Z";
            }else{
                current = printer.currentZ + "mm"
            }
            message = message.replace(/\[CurrentZ\]/g, current);
        }
        if(message.includes("[PercentRemaining]")){
            message = message.replace(/\[PercentRemaining\]/g, progress.completion.toFixed(0)+"%");
        }
        if(message.includes("[CurrentTime]")){
            let dateNow = new Date();
            dateNow = dateNow.toLocaleString();
            message = message.replace(/\[CurrentTime\]/g, dateNow);
        }
        if(message.includes("[CurrentFile]")){
            message = message.replace(/\[CurrentFile\]/g, job.file.display);
        }
        if(message.includes("[CurrentFilePath]")){
            message = message.replace(/\[CurrentFilePath\]/g, job.file.path);
        }
        if(message.includes("[Tool0Temp]")){
            if (
                typeof printer.temps != "undefined" &&
                typeof printer.temps[0].tool0 != "undefined" &&
                typeof printer.temps[0].tool0.target != "undefined"
            ) {
                message = message.replace(/\[Tool0Temp\]/g, "T:"+ printer.temps[0].tool0.target + "°C" + " / A:" + printer.temps[0].tool0.actual + "°C");
            }else{
                message = message.replace(/\[Tool0Temp\]/g, "No tool0 temperature");
            }

        }
        if(message.includes("[BedTemp]")){
            if (
                typeof printer.temps != "undefined" &&
                typeof printer.temps[0].bed != "undefined" &&
                typeof printer.temps[0].bed.target != "undefined"
            ) {
                message = message.replace(/\[BedTemp\]/g, "T:"+ printer.temps[0].bed.target + "°C" + " / A:" + printer.temps[0].bed.actual + "°C");
            }else{
                message = message.replace(/\[BedTemp\]/g, "No tool0 temperature");
            }
        }
        if(message.includes("[Error!]")){
            let errMess = "No Error"
            if(printer.state.includes("Error")){
                errMess = printer.stateDescription
            }
            message = message.replace(/\[Error!\]/g, errMess);
        }

        return JSON.stringify(message);
    }
}

const generateTime = function(seconds) {
    let string = "";
    if (seconds === undefined || isNaN(seconds) || seconds === null) {
        string = "Done";
    } else {
        let days = Math.floor(seconds / (3600 * 24));

        seconds -= days * 3600 * 24;
        let hrs = Math.floor(seconds / 3600);

        seconds -= hrs * 3600;
        let mnts = Math.floor(seconds / 60);

        seconds -= mnts * 60;
        seconds = Math.floor(seconds);

        string =
            days +
            " Days, " +
            hrs +
            " Hrs, " +
            mnts +
            " Mins, " +
            seconds +
            " Seconds";
        if (mnts == 0) {
            if (string.includes("0 Mins")) {
                string = string.replace(" 0 Mins,", "");
            }
        }
        if (hrs == 0) {
            if (string.includes("0 Hrs")) {
                string = string.replace(" 0 Hrs,", "");
            }
        }
        if (days == 0) {
            if (string.includes("0 Days")) {
                string = string.replace("0 Days,", "");
            }
        }
        if (mnts == 0 && hrs == 0 && days == 0 && seconds == 0) {
            string = string.replace("0 Seconds", "Done");
        }
    }
    return string;
};
module.exports = {
    ScriptRunner: ScriptRunner
};