# TODO

- [ ] Add sound system
- [ ] Add collectibles system and/or inventory system

# STATUS OF PRIOR TODOs

- [X] Add state machine system (or does it duplicate ECS?)
  - State data would live on components, tag components can represent data-less states, and an ECS *system* would own any finite state machine (FSM) required for that system. A formal generic FSM is not required at this point.
- [O] Add particle system (for background dynamic prop, e.g. smoke).
- [O] Player running animation
  