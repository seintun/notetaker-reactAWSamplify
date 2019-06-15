import React, { Component } from "react";
import { withAuthenticator } from "aws-amplify-react";
import { API, graphqlOperation } from "aws-amplify";
import { createNote, deleteNote, updateNote } from "./graphql/mutations";
import { listNotes } from "./graphql/queries";
import {
  onCreateNote,
  onDeleteNote,
  onUpdateNote
} from "./graphql/subscriptions";

class App extends Component {
  state = {
    id: "",
    note: "",
    notes: []
  };

  componentDidMount() {
    this.getNotes();
    this.createNoteListener = API.graphql(
      graphqlOperation(onCreateNote)
    ).subscribe({
      next: noteData => {
        const newNote = noteData.value.data.onCreateNote;
        const prevNotes = this.state.notes.filter(
          note => note.id !== newNote.id
        );
        const updatedNotes = [...prevNotes, newNote];
        this.setState({ notes: updatedNotes });
      }
    });
    this.deleteNoteListener = API.graphql(
      graphqlOperation(onDeleteNote)
    ).subscribe({
      next: noteData => {
        const deletedNote = noteData.value.data.onDeleteNote;
        const updatedNotes = this.state.notes.filter(
          note => note.id !== deletedNote.id
        );
        this.setState({ notes: updatedNotes });
      }
    });
    this.updateNoteListener = API.graphql(
      graphqlOperation(onUpdateNote)
    ).subscribe({
      next: noteData => {
        const { notes } = this.state;
        const updatedNote = noteData.value.data.onUpdateNote;
        const index = notes.findIndex(note => note.id === updatedNote.id);
        const updatedNotes = [
          ...notes.slice(0, index),
          updatedNote,
          ...notes.slice(index + 1)
        ];
        this.setState({ notes: updatedNotes, note: "", id: "" });
      }
    });
  }

  componentWillUnmount() {
    this.createNoteListener.unsubscribe();
    this.deleteNoteListener.unsubscribe();
    this.updateNoteListener.unsubscribe();
  }

  getNotes = async () => {
    const result = await API.graphql(graphqlOperation(listNotes));
    this.setState({ notes: result.data.listNotes.items });
  };

  handleChangeNote = event => this.setState({ note: event.target.value });

  hasExistingNote = () => {
    const { notes, id } = this.state;
    if (id) {
      const isNote = notes.findIndex(note => note.id === id) > -1;
      return isNote;
    }
    return false;
  };

  handleAddNote = async event => {
    const { note } = this.state;
    event.preventDefault();
    // check if we have existing note, if so update it
    if (this.hasExistingNote()) {
      this.handleUpdateNote();
    } else {
      // ES6 shorthand on {note: note} and {input: input}
      const input = { note };
      await API.graphql(graphqlOperation(createNote, { input }));
      this.setState({ note: "" });
    }
  };

  handleUpdateNote = async () => {
    const { id, note } = this.state;
    const input = { id, note };
    await API.graphql(graphqlOperation(updateNote, { input }));
  };

  handleDeleteNote = async noteId => {
    const input = { id: noteId };
    await API.graphql(graphqlOperation(deleteNote, { input }));
  };

  handleSetNote = ({ note, id }) => this.setState({ note, id });

  render() {
    const { notes, id, note } = this.state;
    return (
      <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
        <h1 className="code f2-l">Amplify Notetake</h1>
        {/* Note Form */}
        <form onSubmit={this.handleAddNote} className="mb3">
          <input
            type="text"
            className="pa2 f4"
            placeholder="Write your note"
            onChange={this.handleChangeNote}
            // controlled componenets, telling inputs with current value and controlled by state
            value={note}
          />
          <button className="pa2 f4" type="submit">
            {id ? "Update Note" : "Add Note"}
          </button>
        </form>

        {/* Note List */}
        <div>
          {notes.map(item => (
            <div key={item.id} className="flex items-center">
              <li
                onClick={() => this.handleSetNote(item)} // pass entire item to the text field
                className="list pa1 f3"
              >
                {item.note}
              </li>
              <button
                onClick={() => this.handleDeleteNote(item.id)}
                className="bg-transparent bn f4"
              >
                <span>&times;</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
}

export default withAuthenticator(App, { includeGreetings: true });
