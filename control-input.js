// Normalized character control state produced by any input source.
function createControlInput(moveLeft = false, moveRight = false, jump = false) {
    return { moveLeft, moveRight, jump };
}

const NEUTRAL_CONTROL_INPUT = createControlInput();

function applyControlInput(inputComponent, control) {
    inputComponent.moveLeft = control.moveLeft;
    inputComponent.moveRight = control.moveRight;
    inputComponent.jump = control.jump;
}
