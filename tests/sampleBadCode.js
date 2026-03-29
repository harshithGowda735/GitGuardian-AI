const x = 10;
var y = 20; // var is bad practice usually

function doSomething() {
    console.log("doing something"); // unnecessary console.log
    return x + y;
}

const unusedVar = "this is never used";

doSomething();
