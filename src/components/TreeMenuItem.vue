<template>
    <li>
        <div class="horizontal-flexbox center-items">
            <label v-if="hasArrows" v-on:click="toggleOpen" class="small-square blue-circle-hover thin-margin vertical-flexbox flex-centered">
                <div v-if="open" class="bottom-arrow">&nbsp;</div>
                <div v-if="!open" class="left-arrow">&nbsp;</div>
            </label>
            <input type="radio" class="invisible" :value="item.id" :id="name + '-' + item.id" :name="name" v-on:input="$emit('input', $event.target.value)" />
            <label class="blue-hover flex-grow-1 medium-padding horizontal-flexbox center-items" :for="name + '-' + item.id">
                <div :class="'flex-grow-1 ' + (item.warning ? 'warning-color' : '')">{{ itemName }}</div>
                <slot></slot>
            </label>
            <button class="background-color-1" v-for="button in itemButtons" :key="button.id" v-on:click="buttonClicked(button.id)">{{ button.label }}</button>
            <div v-if="editable" class="close" v-on:click="deleteItem"></div>
        </div>
        <div class="horizontal-flexbox start-aligned">
            <div class="indentation-width"></div>
            <div v-if="open" class="flex-grow-1">
                <TreeMenuItem v-for="child in item.children" :item-bus="itemBus" :key="child.id" :editable="editable" :name-field="nameField" :name="name" :item="child" :buttons="buttons" 
                    v-on="$listeners" :parent-id="item.id">
                </TreeMenuItem>
                <li v-if="editable">
                    <AddItem v-on:add-item="addItem"></AddItem>
                </li>
            </div>
        </div>
    </li>
</template>

<script>
import AddItem from "./AddItem.vue";

export default {
    name: "TreeMenuItem",
    components:  { AddItem },
    props: {
        itemBus: Object,
        item: Object,
        name: String,
        buttons: Array,
        nameField: String,
        editable: Boolean,
    },
    data() {
        return {
            open: false,
        };
    },
    mounted() {
        this.itemBus.$on("openAll", () => this.open = Object.keys(this.item.children).length > 0);
        this.itemBus.$on("closeAll", () => this.open = false);
        this.itemBus.$on("toggle", id =>  { if (id === this.item.id) { this.open = !this.open } });
    }, 
    computed: {
        itemButtons() {
            return this.buttons?.filter((button) => button.for === this.item.type);
        },
        hasArrows() {
            return Object.keys(this.item.children ?? {}).length > 0 || this.editable;
        },
        itemName() {
            const name = this.item[this.nameField ?? "name"];
            if (typeof name === "undefined" || name === null || name === "") {
                return "_";
            } else {
                return name;
            }
        },
    },
    methods: {
        toggleOpen() {
            this.itemBus.$emit("toggle", this.item.id);
        },
        addItem(value) {
            this.$emit("add-item", { value, parentId: this.item.id });
        },
        deleteItem() {
            this.$emit("delete-item", { parentId: this.item.parentId, id: this.item.id, itemId: this.item.id });
        },
        buttonClicked(buttonId) {
            this.$emit("button-click", { buttonId, parentId: this.item.parentId, id: this.item.id, itemId: this.item.id });
        },
    }
}
</script>