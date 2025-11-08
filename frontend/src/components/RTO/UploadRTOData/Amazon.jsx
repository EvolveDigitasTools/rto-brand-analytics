

const Amazon = () => {
    return (
        <div>
            <h1>Amazon</h1>
            <div>
                <form 
                    action="submit"
                    style={{display: "grid", justifyContent: "center"}}
                >
                    <input type="file" />
                    <button>Upload</button>
                </form>
            </div>
        </div>
    )
}

export default Amazon